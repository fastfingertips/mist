use std::fs;

use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use walkdir::WalkDir;
use window_vibrancy::apply_mica;

mod defaults;
mod storage;
mod types;
mod utils;

pub use types::*;

fn scan_directory(path: &str, max_depth: Option<usize>) -> Result<(u64, u64), String> {
    let expanded_path = utils::expand_env_vars(path);
    let path_buf = std::path::PathBuf::from(&expanded_path);

    if !path_buf.exists() {
        return Err("Path not found".to_string());
    }

    let mut total_size = 0;
    let mut file_count = 0;

    let walker = match max_depth {
        Some(d) if d > 0 => WalkDir::new(&path_buf).max_depth(d),
        _ => WalkDir::new(&path_buf),
    };

    for entry in walker.into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            file_count += 1;
            if let Ok(metadata) = entry.metadata() {
                total_size += metadata.len();
            }
        }
    }

    Ok((total_size, file_count))
}

#[tauri::command]
fn get_settings(app_handle: tauri::AppHandle) -> AppSettings {
    storage::load_settings(&app_handle)
}

#[tauri::command]
fn save_settings(app_handle: tauri::AppHandle, settings: AppSettings) {
    storage::save_settings_to_file(&app_handle, &settings);
}

#[tauri::command]
fn get_monitors(app_handle: tauri::AppHandle) -> Vec<MonitorConfig> {
    storage::load_monitors_from_file(&app_handle)
}

#[tauri::command]
fn save_monitors(app_handle: tauri::AppHandle, monitors: Vec<MonitorConfig>) {
    storage::save_monitors_to_file(&app_handle, &monitors);
}

#[tauri::command]
fn check_monitor_path(path: String, max_depth: Option<usize>) -> CheckResult {
    match scan_directory(&path, max_depth) {
        Ok((size_bytes, file_count)) => CheckResult {
            size_bytes,
            file_count,
            error: None,
        },
        Err(e) => CheckResult {
            size_bytes: 0,
            file_count: 0,
            error: Some(e),
        },
    }
}

#[tauri::command]
fn check_monitor_path_streaming(
    app_handle: tauri::AppHandle,
    monitor_id: String,
    path: String,
    max_depth: Option<usize>,
) {
    std::thread::spawn(move || {
        let expanded_path = utils::expand_env_vars(&path);
        let path_buf = std::path::PathBuf::from(&expanded_path);

        if !path_buf.exists() {
            app_handle
                .emit(
                    "scan-progress",
                    ScanProgress {
                        monitor_id,
                        size_bytes: 0,
                        file_count: 0,
                        done: true,
                        error: Some("Path not found".to_string()),
                        last_scan_at: None,
                    },
                )
                .ok();
            return;
        }

        let mut total_size: u64 = 0;
        let mut file_count: u64 = 0;

        let walker = match max_depth {
            Some(d) if d > 0 => WalkDir::new(&path_buf).max_depth(d),
            _ => WalkDir::new(&path_buf),
        };

        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                file_count += 1;
                if let Ok(metadata) = entry.metadata() {
                    total_size += metadata.len();
                }
                // Emit progress every 500 files
                if file_count % 500 == 0 {
                    app_handle
                        .emit(
                            "scan-progress",
                            ScanProgress {
                                monitor_id: monitor_id.clone(),
                                size_bytes: total_size,
                                file_count,
                                done: false,
                                error: None,
                                last_scan_at: None,
                            },
                        )
                        .ok();
                }
            }
        }

        // Final result
        app_handle
            .emit(
                "scan-progress",
                ScanProgress {
                    monitor_id,
                    size_bytes: total_size,
                    file_count,
                    done: true,
                    error: None,
                    last_scan_at: Some(
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs(),
                    ),
                },
            )
            .ok();
    });
}

#[tauri::command]
fn open_monitor_path(_app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let expanded_path = utils::expand_env_vars(&path);
    tauri_plugin_opener::open_path(expanded_path, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_defaults(app_handle: tauri::AppHandle) -> Vec<MonitorConfig> {
    let monitors = defaults::get_default_monitors();
    storage::save_monitors_to_file(&app_handle, &monitors);
    monitors
}

#[tauri::command]
fn open_config_folder(app_handle: tauri::AppHandle) -> Result<(), String> {
    let config_path = app_handle.path().app_config_dir().unwrap();
    if !config_path.exists() {
        fs::create_dir_all(&config_path).ok();
    }
    tauri_plugin_opener::open_path(config_path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn export_monitors(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let monitors = storage::load_monitors_from_file(&app_handle);
    let content = serde_json::to_string_pretty(&monitors).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn import_monitors(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let monitors: Vec<MonitorConfig> =
        serde_json::from_str(&content).map_err(|_| "Invalid config file".to_string())?;
    storage::save_monitors_to_file(&app_handle, &monitors);
    Ok(())
}

#[tauri::command]
fn get_windows_accent_color() -> Option<String> {
    utils::get_windows_accent_color()
}

#[tauri::command]
fn is_directory(path: String) -> bool {
    let expanded = utils::expand_env_vars(&path);
    std::path::Path::new(&expanded).is_dir()
}

#[tauri::command]
fn get_folder_name(path: String) -> String {
    let expanded = utils::expand_env_vars(&path);
    std::path::Path::new(&expanded)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("New Folder")
        .to_string()
}

#[tauri::command]
fn test_notification(
    app_handle: tauri::AppHandle,
    id: String,
    name: String,
    path: String,
    #[allow(non_snake_case)] currentMb: f64,
    threshold: f64,
) {
    let expanded_path = utils::expand_env_vars(&path);
    let path_for_callback = expanded_path.clone();
    let app_clone = app_handle.clone();
    let id_clone = id.clone();

    std::thread::spawn(move || {
        use winrt_toast::{Action, Text, Toast, ToastManager};

        let manager = ToastManager::new("com.fastfingertips.mist");

        let mut toast = Toast::new();
        toast
            .text1(&format!("{} exceeded limit!", name))
            .text2(Text::new(&format!(
                "Size: {:.1} GB / {:.1} GB threshold",
                currentMb / 1024.0,
                threshold / 1024.0
            )));

        toast.action(Action::new("Open Folder", "open", ""));
        toast.action(Action::new("Mute Notifications", "mute", ""));

        let _ = manager.show_with_callbacks(
            &toast,
            Some(Box::new(move |e| {
                if let Ok(arg) = e {
                    match arg.as_str() {
                        "open" | "" => {
                            let _ = std::process::Command::new("explorer")
                                .arg(&path_for_callback)
                                .spawn();
                        }
                        "mute" => {
                            let mut monitors = storage::load_monitors_from_file(&app_clone);
                            if let Some(m) = monitors.iter_mut().find(|m| m.id == id_clone) {
                                m.notify = false;
                                storage::save_monitors_to_file(&app_clone, &monitors);
                                app_clone.emit("monitors-updated", ()).ok();
                            }
                        }
                        _ => {}
                    }
                }
            })),
            None,
            None,
        );
    });
}

fn start_background_worker(app_handle: tauri::AppHandle) {
    loop {
        let settings = storage::load_settings(&app_handle);
        let mut monitors = storage::load_monitors_from_file(&app_handle);
        let mut changed = false;

        for monitor in monitors.iter_mut() {
            if monitor.enabled {
                app_handle
                    .emit(
                        "scan-progress",
                        ScanProgress {
                            monitor_id: monitor.id.clone(),
                            size_bytes: 0,
                            file_count: 0,
                            done: false,
                            error: None,
                            last_scan_at: None,
                        },
                    )
                    .ok();

                if let Ok((size_bytes, file_count)) =
                    scan_directory(&monitor.path, monitor.max_depth)
                {
                    let mb = size_bytes as f64 / (1024.0 * 1024.0);
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs();

                    monitor.last_scan_at = Some(now);
                    changed = true;

                    app_handle
                        .emit(
                            "scan-progress",
                            ScanProgress {
                                monitor_id: monitor.id.clone(),
                                size_bytes,
                                file_count,
                                done: true,
                                error: None,
                                last_scan_at: Some(now),
                            },
                        )
                        .ok();

                    if monitor.notify && mb > monitor.threshold {
                        let expanded_path = utils::expand_env_vars(&monitor.path);
                        let name = monitor.name.clone();
                        let threshold = monitor.threshold;
                        let path_clone = expanded_path.clone();
                        let app_clone = app_handle.clone();
                        let id_clone = monitor.id.clone();

                        std::thread::spawn(move || {
                            use winrt_toast::{Action, Text, Toast, ToastManager};

                            let manager = ToastManager::new("com.fastfingertips.mist");

                            let mut toast = Toast::new();
                            toast
                                .text1(&format!("{} exceeded limit!", name))
                                .text2(Text::new(&format!(
                                    "Size: {:.1} GB / {:.1} GB threshold",
                                    mb / 1024.0,
                                    threshold / 1024.0
                                )));

                            toast.action(Action::new("Open Folder", "open", ""));
                            toast.action(Action::new("Mute Notifications", "mute", ""));

                            let _ = manager.show_with_callbacks(
                                &toast,
                                Some(Box::new(move |e| {
                                    if let Ok(arg) = e {
                                        match arg.as_str() {
                                            "open" | "" => {
                                                let _ = std::process::Command::new("explorer")
                                                    .arg(&path_clone)
                                                    .spawn();
                                            }
                                            "mute" => {
                                                let mut monitors =
                                                    storage::load_monitors_from_file(&app_clone);
                                                if let Some(m) =
                                                    monitors.iter_mut().find(|m| m.id == id_clone)
                                                {
                                                    m.notify = false;
                                                    storage::save_monitors_to_file(
                                                        &app_clone, &monitors,
                                                    );
                                                    app_clone.emit("monitors-updated", ()).ok();
                                                }
                                            }
                                            _ => {}
                                        }
                                    }
                                })),
                                None,
                                None,
                            );
                        });
                    }
                }
            }
        }

        if changed {
            storage::save_monitors_to_file(&app_handle, &monitors);
        }

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        app_handle.emit("background-check-complete", now).ok();

        let interval_secs = (settings.check_interval_minutes as u64) * 60;
        std::thread::sleep(Duration::from_secs(interval_secs));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Mist", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app: &tauri::AppHandle, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            std::thread::spawn(move || {
                start_background_worker(app_handle);
            });

            let window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "windows")]
            apply_mica(&window, None).ok();
            #[cfg(target_os = "macos")]
            apply_blur(
                &window,
                window_vibrancy::NSVisualEffectMaterial::AppearanceBased,
            )
            .ok();

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let settings = storage::load_settings(window.app_handle());
                if settings.minimize_to_tray {
                    api.prevent_close();
                    window.hide().unwrap();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_monitors,
            save_monitors,
            check_monitor_path,
            check_monitor_path_streaming,
            open_monitor_path,
            restore_defaults,
            open_config_folder,
            export_monitors,
            import_monitors,
            get_settings,
            save_settings,
            get_windows_accent_color,
            test_notification,
            is_directory,
            get_folder_name
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
