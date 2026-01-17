import { useState, useEffect, useMemo, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { confirm } from "@tauri-apps/plugin-dialog";
import { MonitorConfig, MonitorStatus, AppSettings } from "../types";
import { api, configToStatus } from "../api";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

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
            setMonitors(prev => {
                if (prev.length === 0) return configToStatus(loaded);

                return loaded.map(config => {
                    const existing = prev.find(p => p.id === config.id);
                    if (existing) {
                        return {
                            ...existing,
                            ...config,
                            // Ensure persistent fields from disk are used, 
                            // but runtime fields from 'existing' are preserved
                        };
                    }
                    return {
                        ...config,
                        loading: false,
                        currentSizeBytes: 0,
                        fileCount: 0
                    };
                });
            });
            return configToStatus(loaded);
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

                    if (progress.error) {
                        notifications.show({
                            title: "Scan Error",
                            message: `Failed to scan ${updated.find(m => m.id === progress.monitorId)?.name || 'folder'}: ${progress.error}`,
                            color: "red",
                            icon: <IconX size={16} />
                        });
                    }

                    api.saveMonitors(updated).catch(console.error);
                }
                return updated;
            });
        });

        const unlistenAutoCheck = listen<number>("background-check-complete", (event) => {
            setLastAutoCheck(event.payload);
        });

        const unlistenUpdated = listen("monitors-updated", () => {
            fetchMonitors();
        });

        return () => {
            unlisten.then(fn => fn());
            unlistenAutoCheck.then(fn => fn());
            unlistenUpdated.then(fn => fn());
        };
    }, [fetchMonitors]);

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
            notifications.show({
                title: "Internal State Reset",
                message: "Default monitors have been restored.",
                color: "green",
                icon: <IconCheck size={16} />
            });
        } catch (e) {
            console.error(e);
            notifications.show({
                title: "Restore Failed",
                message: String(e),
                color: "red",
                icon: <IconX size={16} />
            });
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
