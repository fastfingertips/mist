use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonitorConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub threshold: f64, // MB
    pub enabled: bool,
    pub notify: bool,
    #[serde(default)]
    pub max_depth: Option<usize>, // None or 0 = unlimited
    #[serde(default)]
    pub last_scan_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
    pub last_scan_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub size_bytes: u64,
    pub file_count: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub monitor_id: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub done: bool,
    pub error: Option<String>,
    pub last_scan_at: Option<u64>,
}
