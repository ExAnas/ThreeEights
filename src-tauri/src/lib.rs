use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, thread, time::{Duration, SystemTime, UNIX_EPOCH}};
use tauri::{
    image::Image,
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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrayCountdownRequest {
    phase_title: String,
    remaining_ms: u64,
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

fn digit_pattern(digit: u32) -> [u8; 15] {
    match digit {
        0 => [1,1,1, 1,0,1, 1,0,1, 1,0,1, 1,1,1],
        1 => [0,1,0, 1,1,0, 0,1,0, 0,1,0, 1,1,1],
        2 => [1,1,1, 0,0,1, 1,1,1, 1,0,0, 1,1,1],
        3 => [1,1,1, 0,0,1, 1,1,1, 0,0,1, 1,1,1],
        4 => [1,0,1, 1,0,1, 1,1,1, 0,0,1, 0,0,1],
        5 => [1,1,1, 1,0,0, 1,1,1, 0,0,1, 1,1,1],
        6 => [1,1,1, 1,0,0, 1,1,1, 1,0,1, 1,1,1],
        7 => [1,1,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1],
        8 => [1,1,1, 1,0,1, 1,1,1, 1,0,1, 1,1,1],
        9 => [1,1,1, 1,0,1, 1,1,1, 0,0,1, 1,1,1],
        _ => [0; 15],
    }
}

fn put_pixel(rgba: &mut [u8], x: u32, y: u32, color: [u8; 4]) {
    if x >= 32 || y >= 32 {
        return;
    }
    let index = ((y * 32 + x) * 4) as usize;
    rgba[index..index + 4].copy_from_slice(&color);
}

fn draw_digit(rgba: &mut [u8], digit: u32, origin_x: u32, origin_y: u32) {
    let pattern = digit_pattern(digit);
    let scale = 2;
    let color = [255, 255, 255, 255];

    for row in 0..5 {
        for col in 0..3 {
            if pattern[(row * 3 + col) as usize] == 0 {
                continue;
            }
            for dy in 0..scale {
                for dx in 0..scale {
                    put_pixel(
                        rgba,
                        origin_x + col * scale + dx,
                        origin_y + row * scale + dy,
                        color,
                    );
                }
            }
        }
    }
}

fn render_countdown_icon(remaining_ms: u64) -> Image<'static> {
    let mut rgba = vec![0u8; 32 * 32 * 4];
    let background = [89, 75, 218, 255];

    for y in 0..32u32 {
        for x in 0..32u32 {
            let dx = if x < 6 { 6 - x } else if x > 25 { x - 25 } else { 0 };
            let dy = if y < 6 { 6 - y } else if y > 25 { y - 25 } else { 0 };
            if dx * dx + dy * dy <= 36 {
                put_pixel(&mut rgba, x, y, background);
            }
        }
    }

    let total_seconds = (remaining_ms + 999) / 1000;
    let hours = ((total_seconds / 3600).min(99)) as u32;
    let minutes = ((total_seconds % 3600) / 60) as u32;

    draw_digit(&mut rgba, hours / 10, 8, 4);
    draw_digit(&mut rgba, hours % 10, 18, 4);
    draw_digit(&mut rgba, minutes / 10, 8, 18);
    draw_digit(&mut rgba, minutes % 10, 18, 18);

    Image::new_owned(rgba, 32, 32)
}

#[tauri::command]
fn update_tray_countdown(app: AppHandle, request: TrayCountdownRequest) -> Result<(), String> {
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| "tray icon not found".to_string())?;

    tray
        .set_icon(Some(render_countdown_icon(request.remaining_ms)))
        .map_err(|e| e.to_string())?;

    let total_seconds = request.remaining_ms / 1000;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    let tooltip = format!(
        "8×3 — {} — {:02}:{:02}:{:02}",
        request.phase_title, hours, minutes, seconds
    );

    tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())
}

#[tauri::command]
fn reset_tray_countdown(app: AppHandle) -> Result<(), String> {
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| "tray icon not found".to_string())?;

    if let Some(icon) = app.default_window_icon() {
        tray.set_icon(Some(icon.clone())).map_err(|e| e.to_string())?;
    }

    tray
        .set_tooltip(Some("8×3 — يوم متوازن"))
        .map_err(|e| e.to_string())
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
            cancel_phase_notification,
            update_tray_countdown,
            reset_tray_countdown
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "فتح 8×3", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "خروج", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let mut tray = TrayIconBuilder::with_id("main-tray")
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
