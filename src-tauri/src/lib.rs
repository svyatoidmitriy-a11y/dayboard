use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::Duration,
};

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartExt};
use tauri_plugin_notification::NotificationExt;

struct ClosePolicy(AtomicBool);

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("dayboard.sqlite3"))
}

fn connect(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.busy_timeout(Duration::from_secs(5)).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         CREATE TABLE IF NOT EXISTS app_snapshot (
           id INTEGER PRIMARY KEY CHECK (id = 1),
           schema_version INTEGER NOT NULL DEFAULT 1,
           payload TEXT NOT NULL,
           saved_at TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS notification_log (
           task_id TEXT NOT NULL,
           scheduled_at TEXT NOT NULL,
           sent_at TEXT NOT NULL,
           PRIMARY KEY(task_id, scheduled_at)
         );"
    ).map_err(|e| e.to_string())?;
    Ok(conn)
}

fn current_json(conn: &Connection) -> Result<Option<String>, String> {
    conn.query_row("SELECT payload FROM app_snapshot WHERE id=1", [], |row| row.get::<_, String>(0))
        .optional().map_err(|e| e.to_string())
}

#[tauri::command]
fn load_state(app: AppHandle) -> Result<Option<String>, String> {
    current_json(&connect(&app)?)
}

// Keep validation independent of Tauri so Windows CI can unit-test data integrity.
fn validate_state_json(json: &str) -> Result<(), String> {
    let data: Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    if data["version"].as_u64() != Some(1)
        || !data["tasks"].is_array()
        || !data["tags"].is_array()
        || !data["settings"].is_object()
    {
        return Err("Invalid DAYBOARD data format".into());
    }
    Ok(())
}

#[tauri::command]
fn save_state(app: AppHandle, json: String) -> Result<(), String> {
    validate_state_json(&json)?;
    let conn = connect(&app)?;
    conn.execute(
        "INSERT INTO app_snapshot(id,schema_version,payload,saved_at) VALUES(1,1,?1,?2)
         ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, saved_at=excluded.saved_at",
        params![json, Utc::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_close_to_tray(policy: tauri::State<'_, ClosePolicy>, enabled: bool) {
    policy.0.store(enabled, Ordering::SeqCst);
}

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn get_autostart(app: AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

fn create_backup(app: &AppHandle, daily: bool) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let now = Utc::now();
    let name = if daily {
        format!("dayboard-auto-{}.json", now.format("%Y-%m-%d"))
    } else {
        format!("dayboard-{}.json", now.format("%Y-%m-%d_%H-%M-%S"))
    };
    let path = dir.join(name);
    if !path.exists() {
        if let Some(json) = current_json(&connect(app)?)? {
            // An atomic temporary-file rename protects against partial backups.
            let temp = path.with_extension("tmp");
            fs::write(&temp, json.as_bytes()).map_err(|e| e.to_string())?;
            fs::rename(&temp, &path).map_err(|e| e.to_string())?;
        }
    }
    if daily {
        let mut copies: Vec<PathBuf> = fs::read_dir(&dir).map_err(|e| e.to_string())?
            .filter_map(|x| x.ok().map(|y| y.path()))
            .filter(|x| x.file_name().and_then(|n| n.to_str()).unwrap_or("").starts_with("dayboard-auto-"))
            .collect();
        copies.sort();
        let old_count = copies.len().saturating_sub(7);
        for obsolete in copies.into_iter().take(old_count) { let _ = fs::remove_file(obsolete); }
    }
    Ok(path)
}

#[tauri::command]
fn backup_now(app: AppHandle) -> Result<String, String> {
    create_backup(&app, false).map(|x| x.display().to_string())
}

fn check_notifications(app: &AppHandle) -> Result<(), String> {
    let mut conn = connect(app)?;
    let json = match current_json(&conn)? { Some(value) => value, None => return Ok(()) };
    let data: Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    if data["settings"]["notifications"].as_bool() == Some(false) { return Ok(()); }
    let tasks = match data["tasks"].as_array() { Some(items) => items, None => return Ok(()) };
    let now = Utc::now();
    let mut due: Vec<(String,String,String)> = Vec::new();
    for task in tasks {
        if task["deletedAt"].is_string() || task["status"].as_str() == Some("done") { continue; }
        let (Some(task_id),Some(title),Some(at))=(task["id"].as_str(),task["title"].as_str(),task["remindAt"].as_str()) else { continue };
        let Ok(parsed) = DateTime::parse_from_rfc3339(at) else { continue };
        let when = parsed.with_timezone(&Utc);
        if when > now || now.signed_duration_since(when).num_hours() >= 24 { continue; }
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM notification_log WHERE task_id=?1 AND scheduled_at=?2)",
            params![task_id,at],|r|r.get::<_,i64>(0)
        ).map_err(|e|e.to_string())? !=0;
        if !exists { due.push((task_id.to_string(),title.to_string(),at.to_string())); }
    }
    if due.is_empty() { return Ok(()) }
    if due.len() <= 3 {
        for (_,title,_) in &due {
            app.notification().builder().title("DAYBOARD · Напоминание").body(title).show().map_err(|e|e.to_string())?;
        }
    } else {
        app.notification().builder().title("DAYBOARD · Напоминания")
            .body(format!("У вас {} задач с напоминаниями",due.len()))
            .show().map_err(|e|e.to_string())?;
    }
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (task_id, _, at) in due {
        tx.execute("INSERT OR IGNORE INTO notification_log(task_id,scheduled_at,sent_at) VALUES(?1,?2,?3)",
            params![task_id, at, now.to_rfc3339()]).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

fn start_services(app: AppHandle) {
    thread::spawn(move || {
        // All background activities run on this worker: no JS timers in hidden windows.
        let mut ticks: u64 = 0;
        loop {
            if let Err(err) = check_notifications(&app) { eprintln!("DAYBOARD notifications: {err}"); }
            if ticks % 120 == 0 {
                if let Err(err) = create_backup(&app, true) { eprintln!("DAYBOARD backup: {err}"); }
            }
            ticks = ticks.wrapping_add(1);
            thread::sleep(Duration::from_secs(30));
        }
    });
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show_window(app)))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(ClosePolicy(AtomicBool::new(true)))
        .invoke_handler(tauri::generate_handler![
            load_state, save_state, set_close_to_tray, set_always_on_top,
            set_autostart, get_autostart, backup_now
        ])
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Открыть DAYBOARD", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("Configured icon").clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_window(tray.app_handle());
                    }
                })
                .build(app)?;
            let handle = app.handle().clone();
            // Open DB while errors can still be surfaced at startup.
            connect(&handle).map_err(std::io::Error::other)?;
            start_services(handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.app_handle().state::<ClosePolicy>().0.load(Ordering::SeqCst) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Failed to start DAYBOARD");
}

#[cfg(test)]
mod tests {
    use super::validate_state_json;

    #[test]
    fn accepts_complete_state() {
        assert!(validate_state_json(r#"{"version":1,"tasks":[],"tags":[],"settings":{}}"#).is_ok());
    }

    #[test]
    fn rejects_missing_fields() {
        for bad in [
            "{}",
            r#"{"version":2,"tasks":[],"tags":[],"settings":{}}"#,
            r#"{"version":1,"tasks":{},"tags":[],"settings":{}}"#,
            r#"{"version":1,"tasks":[],"tags":null,"settings":{}}"#,
            r#"{"version":1,"tasks":[],"tags":[],"settings":null}"#,
            "not-json",
        ] {
            assert!(validate_state_json(bad).is_err(), "Should reject: {bad}");
        }
    }
}
