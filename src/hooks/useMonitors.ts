import { useState, useEffect, useMemo, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { confirm } from "@tauri-apps/plugin-dialog";
import { MonitorConfig, MonitorStatus, AppSettings } from "../types";
import { api, configToStatus } from "../api";

type ScanProgress = {
    monitorId: string;
    sizeBytes: number;
    fileCount: number;
    done: boolean;
    error: string | null;
    lastScanAt?: number;
};

const updateMonitorWithProgress = (monitors: MonitorStatus[], progress: ScanProgress): MonitorStatus[] => {
    return monitors.map(m => {
        if (m.id === progress.monitorId) {
            return {
                ...m,
                currentSizeBytes: progress.sizeBytes,
                fileCount: progress.fileCount,
                error: progress.error,
                loading: !progress.done,
                lastScanAt: progress.lastScanAt ?? m.lastScanAt
            };
        }
        return m;
    });
};

const checkIfAnyLoading = (monitors: MonitorStatus[]): boolean => {
    return monitors.some(m => m.loading && m.enabled);
};

export function useMonitors() {
    const [monitors, setMonitors] = useState<MonitorStatus[]>([]);
    const [scanning, setScanning] = useState(false);
    const [settings, setSettings] = useState<AppSettings>({ minimizeToTray: true, checkIntervalMinutes: 60 });
    const [lastAutoCheck, setLastAutoCheck] = useState<number | null>(null);

    const scanOneStreaming = useCallback((monitor: MonitorConfig) => {
        setMonitors(prev => prev.map(m => m.id === monitor.id ? { ...m, loading: true, error: null } : m));
        setScanning(true);
        api.checkMonitorPathStreaming(monitor.id, monitor.path, monitor.maxDepth);
    }, []);

    const scanAllInternal = useCallback((list: MonitorStatus[]) => {
        setScanning(true);
        for (const m of list) {
            if (m.enabled) {
                scanOneStreaming(m);
            }
        }
    }, [scanOneStreaming]);

    const scanAll = useCallback(() => scanAllInternal(monitors), [monitors, scanAllInternal]);

    const fetchMonitors = useCallback(async () => {
        try {
            const loaded = await api.getMonitors();
            const withStatus = configToStatus(loaded);
            setMonitors(withStatus);
            return withStatus;
        } catch (e) {
            console.error("Failed to load monitors", e);
        }
    }, []);

    const saveToRust = useCallback(async (newMonitors: MonitorConfig[]) => {
        try {
            await api.saveMonitors(newMonitors);
        } catch (e) {
            console.error("Failed to save", e);
        }
    }, []);

    useEffect(() => {
        const unlisten = listen<ScanProgress>("scan-progress", (event) => {
            const progress = event.payload;

            setMonitors(prev => {
                const updated = updateMonitorWithProgress(prev, progress);

                if (progress.done) {
                    const anyLoading = checkIfAnyLoading(updated);
                    if (!anyLoading) setScanning(false);
                    api.saveMonitors(updated).catch(console.error);
                }
                return updated;
            });
        });

        const unlistenAutoCheck = listen<number>("background-check-complete", (event) => {
            setLastAutoCheck(event.payload);
        });

        return () => {
            unlisten.then(fn => fn());
            unlistenAutoCheck.then(fn => fn());
        };
    }, []);

    useEffect(() => {
        const init = async () => {
            const loadedMonitors = await fetchMonitors();
            await api.getSettings().then(setSettings);

            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            await getCurrentWindow().show();

            if (loadedMonitors && loadedMonitors.length > 0) {
                setTimeout(() => scanAllInternal(loadedMonitors), 500);
            }
        };
        init();
    }, [fetchMonitors, scanAllInternal]);

    const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
        setSettings(newSettings);
        api.saveSettings(newSettings);
    }, []);

    const handleAdd = useCallback((name: string, path: string, threshold: number) => {
        const newMonitor: MonitorConfig = {
            id: Date.now().toString(),
            name,
            path,
            threshold,
            enabled: true,
            notify: false
        };

        const updated = [...monitors, { ...newMonitor, loading: true }];
        setMonitors(updated);
        saveToRust(updated);
        scanOneStreaming(newMonitor);
    }, [monitors, saveToRust, scanOneStreaming]);

    const handleEditSave = useCallback((id: string, name: string, path: string, threshold: number, maxDepth: number | undefined, enabled: boolean) => {
        const updated = monitors.map(m => {
            if (m.id === id) {
                return {
                    ...m,
                    name,
                    path,
                    threshold,
                    maxDepth,
                    enabled,
                    loading: enabled
                };
            }
            return m;
        });
        setMonitors(updated);
        saveToRust(updated);

        if (enabled) {
            const idx = updated.findIndex(m => m.id === id);
            if (idx !== -1) scanOneStreaming(updated[idx]);
        }
    }, [monitors, saveToRust, scanOneStreaming]);

    const handleToggleNotify = useCallback((id: string) => {
        const updated = monitors.map(m => {
            if (m.id === id) {
                return { ...m, notify: !m.notify };
            }
            return m;
        });
        setMonitors(updated);
        saveToRust(updated);
    }, [monitors, saveToRust]);

    const handleToggleEnabled = useCallback((id: string) => {
        let newStatus = false;
        const updated = monitors.map(m => {
            if (m.id === id) {
                newStatus = !m.enabled;
                return {
                    ...m,
                    enabled: newStatus,
                    loading: newStatus
                };
            }
            return m;
        });
        setMonitors(updated);
        saveToRust(updated);

        if (newStatus) {
            const idx = updated.findIndex(m => m.id === id);
            if (idx !== -1) scanOneStreaming(updated[idx]);
        }
    }, [monitors, saveToRust, scanOneStreaming]);

    const removeMonitor = useCallback(async (id: string) => {
        const confirmed = await confirm("Stop tracking this folder?\n\n(No files will be deleted)", { title: "Confirm Removal", kind: "warning" });
        if (!confirmed) return;
        const updated = monitors.filter(m => m.id !== id);
        setMonitors(updated);
        saveToRust(updated);
    }, [monitors, saveToRust]);

    const handleRestore = useCallback(async () => {
        try {
            const loaded = await api.restoreDefaults();
            const withStatus = loaded.map(m => ({ ...m, loading: true }));
            setMonitors(withStatus as MonitorStatus[]);
            setTimeout(() => scanAllInternal(withStatus as MonitorStatus[]), 500);
        } catch (e) {
            console.error(e);
        }
    }, [scanAllInternal]);

    const stats = useMemo(() => {
        let totalSize = 0;
        let criticalCount = 0;
        monitors.forEach(m => {
            if (m.enabled) {
                if (m.currentSizeBytes) totalSize += m.currentSizeBytes;
                const mb = (m.currentSizeBytes || 0) / (1024 * 1024);
                if (mb > m.threshold) criticalCount++;
            }
        });
        return { totalSize, criticalCount };
    }, [monitors]);

    return {
        monitors,
        scanning,
        settings,
        lastAutoCheck,
        stats,
        actions: {
            scanAll,
            scanOneStreaming,
            handleUpdateSettings,
            handleAdd,
            handleEditSave,
            handleToggleNotify,
            handleToggleEnabled,
            removeMonitor,
            handleRestore,
            setMonitors
        }
    };
}
