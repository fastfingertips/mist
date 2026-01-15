use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use walkdir::WalkDir;
use window_vibrancy::apply_mica;

mod defaults;

// --- TYPES ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonitorConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub threshold: f64, // MB
    pub enabled: bool,
    pub notify: bool,
    #[serde(default)]
    pub max_depth: Option<usize>, // None or 0 = unlimited
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub minimize_to_tray: bool,
    #[serde(default = "default_check_interval")]
    pub check_interval_minutes: u32,
}

fn default_check_interval() -> u32 {
    60
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            minimize_to_tray: true,
            check_interval_minutes: 60,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonitorStatus {
    pub id: String,
    pub name: String,
    pub path: String,
    pub threshold: f64,
    pub current_size_bytes: Option<u64>,
    pub loading: bool,
    pub error: Option<String>,
    pub enabled: bool,
    pub notify: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckResult {
    pub size_bytes: u64,
    pub file_count: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanProgress {
    pub monitor_id: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub done: bool,
    pub error: Option<String>,
}

// --- UTILS ---

// Config Path
fn get_config_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_config_dir()
        .unwrap()
        .join("monitors.json")
}

fn get_settings_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_config_dir()
        .unwrap()
        .join("settings.json")
}

fn load_settings(app_handle: &tauri::AppHandle) -> AppSettings {
    let path = get_settings_path(app_handle);
    if path.exists() {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(settings) = serde_json::from_str(&content) {
                return settings;
            }
        }
    }
    AppSettings::default()
}

fn save_settings_to_file(app_handle: &tauri::AppHandle, settings: &AppSettings) {
    let path = get_settings_path(app_handle);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).ok();
    }
    let content = serde_json::to_string_pretty(settings).unwrap();
    fs::write(path, content).ok();
}

// File Operations
fn load_monitors_from_file(app_handle: &tauri::AppHandle) -> Vec<MonitorConfig> {
    let config_path = get_config_path(app_handle);
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(config_path) {
            if let Ok(monitors) = serde_json::from_str(&content) {
                return monitors;
            }
        }
    }
    defaults::get_default_monitors()
}

fn save_monitors_to_file(app_handle: &tauri::AppHandle, monitors: &Vec<MonitorConfig>) {
    let config_path = get_config_path(app_handle);
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).ok();
    }
    let content = serde_json::to_string_pretty(monitors).unwrap();
    fs::write(config_path, content).ok();
}

// Helpers
fn expand_env_vars(path: &str) -> String {
    let mut expanded = path.to_string();

    // Windows style %VAR%
    let re = regex::Regex::new(r"%([^%]+)%").unwrap();
    for cap in re.captures_iter(path) {
        let var_name = &cap[1];
        if let Ok(value) = std::env::var(var_name) {
            expanded = expanded.replace(&cap[0], &value);
        }
    }

    expanded
}

fn scan_directory(path: &str, max_depth: Option<usize>) -> Result<(u64, u64), String> {
    let expanded_path = expand_env_vars(path);
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

// --- COMMANDS ---

#[tauri::command]
fn get_settings(app_handle: tauri::AppHandle) -> AppSettings {
    load_settings(&app_handle)
}

#[tauri::command]
fn save_settings(app_handle: tauri::AppHandle, settings: AppSettings) {
    save_settings_to_file(&app_handle, &settings);
}

#[tauri::command]
fn get_monitors(app_handle: tauri::AppHandle) -> Vec<MonitorConfig> {
    load_monitors_from_file(&app_handle)
}

#[tauri::command]
fn save_monitors(app_handle: tauri::AppHandle, monitors: Vec<MonitorConfig>) {
    save_monitors_to_file(&app_handle, &monitors);
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
    let expanded_path = expand_env_vars(&path);
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
            },
        )
        .ok();
}

#[tauri::command]
fn open_monitor_path(_app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let expanded_path = expand_env_vars(&path);
    tauri_plugin_opener::open_path(expanded_path, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_defaults(app_handle: tauri::AppHandle) -> Vec<MonitorConfig> {
    let monitors = defaults::get_default_monitors();
    save_monitors_to_file(&app_handle, &monitors);
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
    let monitors = load_monitors_from_file(&app_handle);
    let content = serde_json::to_string_pretty(&monitors).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn import_monitors(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let monitors: Vec<MonitorConfig> =
        serde_json::from_str(&content).map_err(|_| "Invalid config file".to_string())?;
    save_monitors_to_file(&app_handle, &monitors);
    Ok(())
}

#[tauri::command]
fn get_windows_accent_color() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        // Try DWM ColorizationColor (Usually ARGB)
        if let Ok(dwm) = hkcu.open_subkey("Software\\Microsoft\\Windows\\DWM") {
            if let Ok(color) = dwm.get_value::<u32, _>("ColorizationColor") {
                println!("DWM Color: {:X}", color);
                return Some(format!("#{:06X}", color & 0x00FFFFFF));
            }
        }

        // Fallback: Explorer AccentColorMenu (Usually ABGR)
        if let Ok(accent) =
            hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent")
        {
            if let Ok(color) = accent.get_value::<u32, _>("AccentColorMenu") {
                println!("Explorer Accent: {:X}", color);
                let r = color & 0xFF;
                let g = (color >> 8) & 0xFF;
                let b = (color >> 16) & 0xFF;
                return Some(format!("#{:02X}{:02X}{:02X}", r, g, b));
            }
        }
    }
    None
}

// Background Worker
fn start_background_worker(app_handle: tauri::AppHandle) {
    loop {
        let settings = load_settings(&app_handle);
        let monitors = load_monitors_from_file(&app_handle);
        for monitor in monitors {
            if monitor.enabled && monitor.notify {
                if let Ok((size_bytes, _)) = scan_directory(&monitor.path, monitor.max_depth) {
                    let mb = size_bytes as f64 / (1024.0 * 1024.0);
                    if mb > monitor.threshold {
                        app_handle
                            .notification()
                            .builder()
                            .title(format!("{} is full!", monitor.name))
                            .body(format!(
                                "Current size: {:.0} MB (Threshold: {:.0} MB)",
                                mb, monitor.threshold
                            ))
                            .show()
                            .ok();
                    }
                }
            }
        }
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

            // System Tray Menu
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
                let settings = load_settings(window.app_handle());
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
            get_windows_accent_color
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
