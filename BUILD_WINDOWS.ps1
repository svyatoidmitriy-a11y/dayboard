# Build native Windows x64 binaries with Tauri 2, then smoke-test the executable.
# Run from Windows PowerShell on Windows 11 after installing Rust/MSVC build prerequisites.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw 'Cargo/Rust missing. Install Rust MSVC (rustup.rs), then reopen PowerShell.'
}
if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue) -and -not (Get-Command link.exe -ErrorAction SilentlyContinue)) {
    Write-Warning 'MSVC Build Tools not detected on PATH. Tauri requires the Visual Studio C++ build tools and Windows SDK.'
}

Push-Location $root
try {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        node --check 'web/app.js'
        if ($LASTEXITCODE -ne 0) { throw 'Frontend JavaScript syntax check failed.' }
    }
    Write-Host 'DAYBOARD: testing Rust...' -ForegroundColor Cyan
    cargo test --manifest-path 'src-tauri/Cargo.toml'
    if ($LASTEXITCODE -ne 0) { throw 'Rust unit tests failed.' }
    Write-Host 'DAYBOARD: preparing Tauri CLI...' -ForegroundColor Cyan
    cargo install tauri-cli --version '^2' --locked
    if ($LASTEXITCODE -ne 0) { throw 'Installing Tauri CLI failed.' }
    Write-Host 'DAYBOARD: compiling x64 Windows release and installer...' -ForegroundColor Cyan
    Push-Location 'src-tauri'
    try {
        cargo tauri build
        if ($LASTEXITCODE -ne 0) { throw 'Tauri compilation failed.' }
    } finally { Pop-Location }
    Write-Host 'DAYBOARD: validating native executable...' -ForegroundColor Cyan
    & (Join-Path $root 'tests/smoke-windows.ps1')
    if (-not $?) { throw 'Windows smoke test failed.' }
    $nsis = Join-Path $root 'src-tauri/target/release/bundle/nsis'
    $inst = @(Get-ChildItem -LiteralPath $nsis -Filter '*.exe')
    Write-Host 'Success: native DAYBOARD build and startup smoke test passed.' -ForegroundColor Green
    $inst | ForEach-Object { Write-Host $_.FullName -ForegroundColor Green }
} finally { Pop-Location }
