export type MonitorConfig = {
    id: string;
    name: string;
    path: string;
    threshold: number;
    enabled: boolean;
    notify: boolean;
    max_depth?: number; // undefined or 0 = unlimited
};

export type MonitorStatus = MonitorConfig & {
    currentSizeBytes?: number;
    fileCount?: number;
    loading: boolean;
    error?: string | null;
};

export type AppSettings = {
    minimize_to_tray: boolean;
};
