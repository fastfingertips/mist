use crate::defaults;
use crate::{AppSettings, MonitorConfig};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

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

pub fn load_settings(app_handle: &tauri::AppHandle) -> AppSettings {
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

pub fn save_settings_to_file(app_handle: &tauri::AppHandle, settings: &AppSettings) {
    let path = get_settings_path(app_handle);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).ok();
    }
    let content = serde_json::to_string_pretty(settings).unwrap();
    fs::write(path, content).ok();
}

pub fn load_monitors_from_file(app_handle: &tauri::AppHandle) -> Vec<MonitorConfig> {
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

pub fn save_monitors_to_file(app_handle: &tauri::AppHandle, monitors: &Vec<MonitorConfig>) {
    let config_path = get_config_path(app_handle);
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).ok();
    }
    let content = serde_json::to_string_pretty(monitors).unwrap();
    fs::write(config_path, content).ok();
}
