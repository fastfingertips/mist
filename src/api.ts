import { invoke } from "@tauri-apps/api/core";
import { MonitorConfig, AppSettings, MonitorStatus } from "./types";

/**
 * API module for centralized Tauri commands.
 * Provides typed wrappers for backend communication.
 */

export const api = {
    /**
     * Settings
     */
    getSettings: (): Promise<AppSettings> =>
        invoke("get_settings"),

    saveSettings: (settings: AppSettings): Promise<void> =>
        invoke("save_settings", { settings }),

    /**
     * Monitors
     */
    getMonitors: (): Promise<MonitorConfig[]> =>
        invoke("get_monitors"),

    saveMonitors: (monitors: MonitorConfig[]): Promise<void> =>
        invoke("save_monitors", { monitors }),

    restoreDefaults: (): Promise<MonitorConfig[]> =>
        invoke("restore_defaults"),

    /**
     * Scanning
     */
    checkMonitorPathStreaming: (monitorId: string, path: string, maxDepth?: number): Promise<void> =>
        invoke("check_monitor_path_streaming", {
            monitorId,
            path,
            maxDepth: maxDepth || null
        }),

    /**
     * System/File Operations
     */
    openMonitorPath: (path: string): Promise<void> =>
        invoke("open_monitor_path", { path }),

    openConfigFolder: (): Promise<void> =>
        invoke("open_config_folder"),

    exportMonitors: (path: string): Promise<void> =>
        invoke("export_monitors", { path }),

    importMonitors: (path: string): Promise<void> =>
        invoke("import_monitors", { path }),

    getWindowsAccentColor: (): Promise<string | null> =>
        invoke("get_windows_accent_color"),
    /**
     * Notifications
     */
    testNotification: (id: string, name: string, path: string, currentMb: number, threshold: number): Promise<void> =>
        invoke("test_notification", { id, name, path, currentMb, threshold }),
};

// Helper to convert config to status with default UI state
export const configToStatus = (monitors: MonitorConfig[]): MonitorStatus[] => {
    return monitors.map(m => ({
        ...m,
        loading: false,
        currentSizeBytes: 0,
        fileCount: 0
    }));
};
