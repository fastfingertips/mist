export type MonitorConfig = {
    id: string;
    name: string;
    path: string;
    threshold: number;
    enabled: boolean;
    notify: boolean;
};

export type MonitorStatus = MonitorConfig & {
    currentSizeBytes?: number;
    loading: boolean;
    error?: string | null;
};

export type AppSettings = {
    minimize_to_tray: boolean;
};
