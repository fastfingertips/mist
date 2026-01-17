import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { confirm } from "@tauri-apps/plugin-dialog";
import { MonitorConfig, MonitorStatus, AppSettings, ScanProgress } from "../types";
import { api } from "../api";
import { updateMonitorWithProgress, configToStatus, generateId, isDuplicatePath, calculateStats, mergeMonitors } from "../utils";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX, IconAlertTriangle } from "@tabler/icons-react";

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

    // Sequential scan: returns a Promise that resolves when this monitor's scan completes
    // Note: State updates are handled by the global scan-progress listener
    const scanOneStreamingAsync = useCallback((monitor: MonitorConfig): Promise<void> => {
        return new Promise((resolve) => {
            let unlistenFn: (() => void) | null = null;

            // Set up listener first
            listen<ScanProgress>("scan-progress", (event) => {
                if (event.payload.monitorId === monitor.id && event.payload.done) {
                    if (unlistenFn) unlistenFn();
                    resolve();
                }
            }).then(unlisten => {
                unlistenFn = unlisten;
                // Listener is ready, now start scan
                api.checkMonitorPathStreaming(monitor.id, monitor.path, monitor.maxDepth);
            });
        });
    }, []);

    // Sequential scanning: one monitor at a time
    const scanAllInternal = useCallback(async (list: MonitorStatus[]) => {
        setScanning(true);
        const enabledMonitors = list.filter(m => m.enabled);

        for (const m of enabledMonitors) {
            // Set loading state for current monitor
            setMonitors(prev => prev.map(mon =>
                mon.id === m.id ? { ...mon, loading: true, error: null } : mon
            ));

            await scanOneStreamingAsync(m);

            // Immediately mark this monitor as done
            setMonitors(prev => prev.map(mon =>
                mon.id === m.id ? { ...mon, loading: false } : mon
            ));
        }



        // Update last check time for manual scans too
        setLastAutoCheck(Math.floor(Date.now() / 1000));

        // Force all monitors to stop loading (safety net for delayed events)
        setMonitors(prev => prev.map(m => ({ ...m, loading: false })));
        setScanning(false);
    }, [scanOneStreamingAsync]);

    const scanAll = useCallback((customList?: MonitorStatus[]) => {
        scanAllInternal(customList || monitors);
    }, [monitors, scanAllInternal]);

    const monitorsRef = useRef(monitors);
    useEffect(() => { monitorsRef.current = monitors; }, [monitors]);

    const fetchMonitors = useCallback(async () => {
        try {
            const loaded = await api.getMonitors();
            setMonitors(prev => mergeMonitors(prev, loaded));
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





    const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
        setSettings(newSettings);
        api.saveSettings(newSettings);
    }, []);

    const handleAdd = useCallback((name: string, path: string, threshold: number) => {
        if (isDuplicatePath(monitors, path)) {
            notifications.show({
                title: "Folder Already Exists",
                message: `The folder "${name}" is already being monitored.`,
                color: "orange",
                icon: <IconAlertTriangle size={16} />
            });
            return false;
        }

        const newMonitor: MonitorConfig = {
            id: generateId(),
            name,
            path,
            threshold,
            enabled: true,
            notify: false
        };

        setMonitors(prev => {
            const updated = [...prev, { ...newMonitor, loading: true }];
            saveToRust(updated);
            return updated;
        });
        scanOneStreaming(newMonitor);
        return true;
    }, [monitors, saveToRust, scanOneStreaming]);

    const handleEditSave = useCallback((id: string, name: string, path: string, threshold: number, maxDepth: number | undefined, enabled: boolean) => {
        if (isDuplicatePath(monitors, path, id)) {
            notifications.show({
                title: "Path Already Monitored",
                message: "Another monitor item is already using this folder path.",
                color: "orange",
                icon: <IconAlertTriangle size={16} />
            });
            return;
        }

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

    useEffect(() => {
        const unlisten = listen<ScanProgress>("scan-progress", (event) => {
            const progress = event.payload;

            setMonitors(prev => updateMonitorWithProgress(prev, progress));

            if (progress.done) {
                // Calculate updated state for side effects
                const currentMonitors = monitorsRef.current;
                const updated = updateMonitorWithProgress(currentMonitors, progress);

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
        });

        const unlistenAutoCheck = listen<number>("background-check-complete", (event) => {
            setLastAutoCheck(event.payload);
        });

        const unlistenUpdated = listen("monitors-updated", () => {
            fetchMonitors();
        });

        const unlistenDragDrop = listen<{ paths: string[] }>("tauri://drag-drop", async (event) => {
            let addedCount = 0;
            let duplicateCount = 0;

            for (const path of event.payload.paths) {
                const isDir = await api.isDirectory(path);
                if (isDir) {
                    const name = await api.getFolderName(path);
                    const success = handleAdd(name, path, 1024); // Default 1GB threshold
                    if (success) {
                        addedCount++;
                    } else {
                        duplicateCount++;
                    }
                }
            }

            if (addedCount > 0) {
                notifications.show({
                    title: "Folders Added",
                    message: `Successfully added ${addedCount} folder${addedCount > 1 ? 's' : ''}.`,
                    color: "green",
                    icon: <IconCheck size={16} />
                });
            } else if (duplicateCount === 0 && event.payload.paths.length > 0) {
                notifications.show({
                    title: "Invalid Drop",
                    message: "Only folders can be added. Files are ignored.",
                    color: "orange",
                    icon: <IconAlertTriangle size={16} />
                });
            }
        });

        return () => {
            unlisten.then(fn => fn());
            unlistenAutoCheck.then(fn => fn());
            unlistenUpdated.then(fn => fn());
            unlistenDragDrop.then(fn => fn());
        };
    }, [fetchMonitors, handleAdd]);

    const initRef = useRef(false);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

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

    const stats = useMemo(() => calculateStats(monitors), [monitors]);

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
