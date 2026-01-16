export type MonitorConfig = {
    id: string;
    name: string;
    path: string;
    threshold: number;
    enabled: boolean;
    notify: boolean;
    maxDepth?: number; // undefined or 0 = unlimited
    lastScanAt?: number;
};

export type MonitorStatus = MonitorConfig & {
    currentSizeBytes?: number;
    fileCount?: number;
    loading: boolean;
    error?: string | null;
};

export type AppSettings = {
    minimizeToTray: boolean;
    checkIntervalMinutes: number;
};
