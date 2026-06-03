use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalSize, WebviewWindow,
};

const DATA_FILE: &str = "desk-note.json";

#[derive(Default)]
struct QuitState {
    quitting: AtomicBool,
}

fn main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "main window is not available".to_string())
}

fn data_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("failed to create app data directory: {error}"))?;
    Ok(dir.join(DATA_FILE))
}

#[tauri::command]
fn load_data(app: AppHandle) -> Result<Option<String>, String> {
    let path = data_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }

    fs::read_to_string(path)
        .map(Some)
        .map_err(|error| format!("failed to read saved notes: {error}"))
}

#[tauri::command]
fn save_data(app: AppHandle, data: String) -> Result<(), String> {
    let path = data_path(&app)?;
    fs::write(path, data).map_err(|error| format!("failed to save notes: {error}"))
}

#[tauri::command]
fn set_compact_window(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window
        .set_size(PhysicalSize::new(360_u32, 104_u32))
        .map_err(|error| format!("failed to resize compact window: {error}"))?;
    window
        .set_always_on_top(true)
        .map_err(|error| format!("failed to keep compact window on top: {error}"))?;
    Ok(())
}

#[tauri::command]
fn restore_window(app: AppHandle, width: u32, height: u32) -> Result<(), String> {
    let window = main_window(&app)?;
    let width = width.max(280);
    let height = height.max(240);
    window
        .set_size(PhysicalSize::new(width, height))
        .map_err(|error| format!("failed to restore window size: {error}"))?;
    window
        .set_always_on_top(true)
        .map_err(|error| format!("failed to keep restored window on top: {error}"))?;
    Ok(())
}

#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window
        .show()
        .map_err(|error| format!("failed to show window: {error}"))?;
    window
        .set_focus()
        .map_err(|error| format!("failed to focus window: {error}"))?;
    Ok(())
}

fn install_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Desk Note", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

    TrayIconBuilder::with_id("desk-note-tray")
        .tooltip("Desk Note")
        .icon(
            app.default_window_icon()
                .expect("missing default app icon")
                .clone(),
        )
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => {
                app.state::<QuitState>()
                    .quitting
                    .store(true, Ordering::Relaxed);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .manage(QuitState::default())
        .setup(|app| {
            install_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let should_quit = window
                    .app_handle()
                    .state::<QuitState>()
                    .quitting
                    .load(Ordering::Relaxed);

                if !should_quit {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            set_compact_window,
            restore_window,
            show_main_window
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Desk Note");
}
