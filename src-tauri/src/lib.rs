use regex::Regex;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::Manager;
use walkdir::WalkDir;

#[cfg(target_os = "windows")]
use window_vibrancy::apply_blur;

mod defaults;

fn default_true() -> bool {
    true
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct MonitorConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub threshold: u64,
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub notify: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct MonitorResult {
    path: String,
    expanded_path: String,
    size_bytes: u64,
    size_gb: f64,
    error: Option<String>,
}

// Config Path
fn get_config_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_config_dir()
        .unwrap()
        .join("monitors.json")
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
    let re = Regex::new(r"%([^%]+)%").unwrap();
    re.replace_all(path, |caps: &regex::Captures| {
        let var_name = &caps[1];
        env::var(var_name).unwrap_or_else(|_| caps[0].to_string())
    })
    .to_string()
}

fn calculate_size(path: &str) -> u64 {
    let path_buf = PathBuf::from(path);
    if !path_buf.exists() {
        return 0;
    }

    WalkDir::new(&path_buf)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

// Commands
#[tauri::command]
async fn check_monitor_path(path: String) -> MonitorResult {
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let expanded = expand_env_vars(&path_clone);
        let size_bytes = calculate_size(&expanded);
        let size_gb = size_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

        MonitorResult {
            path: path_clone,
            expanded_path: expanded,
            size_bytes,
            size_gb,
            error: None,
        }
    })
    .await
    .unwrap()
}

#[tauri::command]
fn open_monitor_path(path: String) {
    let expanded = expand_env_vars(&path);
    #[cfg(target_os = "windows")]
    Command::new("explorer").arg(expanded).spawn().ok();
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
fn restore_defaults(app_handle: tauri::AppHandle) -> Vec<MonitorConfig> {
    let config_path = get_config_path(&app_handle);
    if config_path.exists() {
        fs::remove_file(config_path).ok();
    }
    defaults::get_default_monitors()
}

#[tauri::command]
fn open_config_folder(app_handle: tauri::AppHandle) {
    let config_path = get_config_path(&app_handle);
    if let Some(parent) = config_path.parent() {
        #[cfg(target_os = "windows")]
        Command::new("explorer").arg(parent).spawn().ok();
    }
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
    let app_handle = app_handle.clone();
    thread::spawn(move || loop {
        let monitors = load_monitors_from_file(&app_handle);

        for monitor in monitors {
            if !monitor.enabled {
                continue;
            }

            let expanded = expand_env_vars(&monitor.path);
            let size_bytes = calculate_size(&expanded);
            let size_mb = size_bytes / (1024 * 1024);

            if monitor.notify && size_mb > monitor.threshold {
                use tauri_plugin_notification::NotificationExt;
                app_handle
                    .notification()
                    .builder()
                    .title("Cache Alert")
                    .body(&format!(
                        "{} exceeded limit! Current: {} MB",
                        monitor.name, size_mb
                    ))
                    .show()
                    .ok();
            }
        }
        thread::sleep(Duration::from_secs(300));
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            apply_blur(&window, Some((18, 18, 18, 125))).ok();

            start_background_worker(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_monitor_path,
            open_monitor_path,
            get_monitors,
            save_monitors,
            restore_defaults,
            open_config_folder,
            export_monitors,
            import_monitors
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
