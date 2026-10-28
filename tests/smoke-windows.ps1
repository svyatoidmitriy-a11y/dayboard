# Executed by CI on a real Windows runner after cargo tauri build.
# Verifies that the compiled PE can start and initialize its SQLite database.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $root 'src-tauri\target\release\dayboard.exe'
$nsisDir = Join-Path $root 'src-tauri\target\release\bundle\nsis'
if (-not (Test-Path -LiteralPath $exe)) { throw "Missing native executable: $exe" }
$installers = @(Get-ChildItem -LiteralPath $nsisDir -Filter '*.exe' -ErrorAction Stop)
if ($installers.Count -lt 1) { throw "Missing NSIS installer under $nsisDir" }

# Do not equate an .exe extension with a valid Windows binary.
$reader = [System.IO.File]::OpenRead($exe)
try {
    $br = [System.IO.BinaryReader]::new($reader)
    if ($br.ReadUInt16() -ne 0x5A4D) { throw 'Invalid MZ header' }
    $reader.Position = 0x3C
    $peOffset = $br.ReadInt32()
    if ($peOffset -lt 64 -or $peOffset -gt $reader.Length - 24) { throw 'Invalid PE offset' }
    $reader.Position = $peOffset
    if ($br.ReadUInt32() -ne 0x00004550) { throw 'Invalid PE signature' }
    $architecture = $br.ReadUInt16()
    if ($architecture -ne 0x8664) { throw "Expected Windows x64 PE, got: $architecture" }
} finally { $reader.Dispose(); $reader = $null }
Write-Host 'PASS: Windows x64 PE executable and NSIS installer exist.' -ForegroundColor Green

$database = Join-Path $env:APPDATA 'app.dayboard.desktop\dayboard.sqlite3'
$started = $null
try {
    $started = Start-Process -FilePath $exe -PassThru
    $running = $false
    $dbReady = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Seconds 1
        $process = Get-Process -Id $started.Id -ErrorAction SilentlyContinue
        if (-not $process) { throw 'DAYBOARD exited during startup. Inspect WebView2/runtime and app logs.' }
        $running = $true
        if ((Test-Path -LiteralPath $database) -and ((Get-Item -LiteralPath $database).Length -gt 0)) {
            $dbReady = $true
            break
        }
    }
    if (-not $running -or -not $dbReady) {
        throw "DAYBOARD started but SQLite was not initialized at: $database"
    }
    Write-Host 'PASS: release executable launched and initialized a nonempty SQLite file.' -ForegroundColor Green
    $memory = (Get-Process -Id $started.Id).WorkingSet64
    Write-Host "Native process working set: $([math]::Round($memory/1MB, 1)) MB (excludes WebView2 children)"
} finally {
    if ($started -and -not $started.HasExited) {
        Stop-Process -Id $started.Id -Force -ErrorAction SilentlyContinue
    }
}
