use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, thread, time::{Duration, SystemTime, UNIX_EPOCH}};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScheduledNotification {
    phase: String,
    phase_title: String,
    next_phase_title: String,
    ends_at: u64,
}

fn schedule_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("scheduled-phase.json"))
}

#[tauri::command]
fn schedule_phase_notification(app: AppHandle, request: ScheduledNotification) -> Result<(), String> {
    let path = schedule_path(&app)?;
    let bytes = serde_json::to_vec(&request).map_err(|e| e.to_string())?;
    fs::write(path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn cancel_phase_notification(app: AppHandle) -> Result<(), String> {
    let path = schedule_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn start_scheduler(app: AppHandle) {
    thread::spawn(move || loop {
        let path = match schedule_path(&app) {
            Ok(path) => path,
            Err(_) => {
                thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        if let Ok(raw) = fs::read(&path) {
            if let Ok(item) = serde_json::from_slice::<ScheduledNotification>(&raw) {
                let now_ms = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);

                if now_ms >= item.ends_at {
                    let _ = app
                        .notification()
                        .builder()
                        .title("8 × 3")
                        .body(format!(
                            "انتهت فترة {} وبدأت فترة {} تلقائياً.",
                            item.phase_title, item.next_phase_title
                        ))
                        .show();
                    let _ = fs::remove_file(&path);
                }
            }
        }

        thread::sleep(Duration::from_secs(3));
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            schedule_phase_notification,
            cancel_phase_notification
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "فتح 8×3", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "خروج", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let mut tray = TrayIconBuilder::new()
                .tooltip("8×3 — يوم متوازن")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            start_scheduler(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running 8x3");
}
