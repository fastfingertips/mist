use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use tauri::Manager;
use window_vibrancy::apply_mica;
use walkdir::WalkDir;
use tauri_plugin_notification::NotificationExt;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButtonState, MouseButton};

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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub minimize_to_tray: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self { minimize_to_tray: true }
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
    app_handle.path().app_config_dir().unwrap().join("settings.json")
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

// This function is no longer used in the new `check_monitor_path` logic.
// fn expand_env_vars(path: &str) -> String {
//     let re = Regex::new(r"%([^%]+)%").unwrap();
//     re.replace_all(path, |caps: &regex::Captures| {
//         let var_name = &caps[1];
//         env::var(var_name).unwrap_or_else(|_| caps[0].to_string())
//     })
//     .to_string()
// }

// This function is no longer used directly in the new `check_monitor_path` logic.
// fn calculate_size(path: &str) -> u64 {
//     let path_buf = PathBuf::from(path);
//     if !path_buf.exists() {
//         return 0;
//     }

//     WalkDir::new(&path_buf)
//         .into_iter()
//         .filter_map(|e| e.ok())
//         .filter_map(|e| e.metadata().ok())
//         .filter(|m| m.is_file())
//         .map(|m| m.len())
//         .sum()
// }

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
fn check_monitor_path(path: String) -> CheckResult {
    let expanded_path = expand_env_vars(&path);
    let path_buf = std::path::PathBuf::from(&expanded_path);

    if !path_buf.exists() {
        return CheckResult { 
            size_bytes: 0, 
            error: Some("Path not found".to_string()) 
        };
    }

    let mut total_size = 0;
    let walker = WalkDir::new(&path_buf).into_iter();
    
    for entry in walker.filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Ok(metadata) = entry.metadata() {
                total_size += metadata.len();
            }
        }
    }
    
    CheckResult { size_bytes: total_size, error: None }
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
    tauri_plugin_opener::open_path(config_path.to_string_lossy().to_string(), None::<&str>).map_err(|e| e.to_string())
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
    let monitors: Vec<MonitorConfig> = serde_json::from_str(&content).map_err(|_| "Invalid config file".to_string())?;
    save_monitors_to_file(&app_handle, &monitors);
    Ok(())
}

// Background Worker
fn start_background_worker(app_handle: tauri::AppHandle) {
    loop {
        let monitors = load_monitors_from_file(&app_handle);
        for monitor in monitors {
            if monitor.enabled && monitor.notify {
                let result = check_monitor_path(monitor.path.clone());
                let mb = result.size_bytes as f64 / (1024.0 * 1024.0);
                if mb > monitor.threshold {
                    app_handle.notification()
                        .builder()
                        .title(format!("{} is full!", monitor.name))
                        .body(format!("Current size: {:.0} MB (Threshold: {:.0} MB)", mb, monitor.threshold))
                        .show()
                        .ok();
                }
            }
        }
        std::thread::sleep(Duration::from_secs(3600)); // Check every hour
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
                    "quit" => { app.exit(0); }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
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
            apply_blur(&window, window_vibrancy::NSVisualEffectMaterial::AppearanceBased).ok();

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
            open_monitor_path,
            restore_defaults,
            open_config_folder,
            export_monitors,
            import_monitors,
            get_settings,
            save_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
