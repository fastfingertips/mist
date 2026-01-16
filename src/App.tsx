import { useState, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { confirm } from "@tauri-apps/plugin-dialog";
import { AppShell, Container } from "@mantine/core";
import { useDisclosure } from '@mantine/hooks';
import "./App.css";


import { MonitorConfig, MonitorStatus, AppSettings } from "./types";
import { TitleBar } from "./components/TitleBar";
import { StatsGrid } from "./components/StatsGrid";
import { MonitorTable } from "./components/MonitorTable";
import { AddMonitorModal } from "./components/AddMonitorModal";
import { EditMonitorModal } from "./components/EditMonitorModal";
import { SettingsModal } from "./components/SettingsModal";
import { StatusBar } from "./components/StatusBar";

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

function App() {
  const [monitors, setMonitors] = useState<MonitorStatus[]>([]);
  const [scanning, setScanning] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ minimizeToTray: true, checkIntervalMinutes: 60 });
  const [lastAutoCheck, setLastAutoCheck] = useState<number | null>(null);


  const [sortBy, setSortBy] = useState<string | null>('name');
  const [reverseSortDirection, setReverseSortDirection] = useState(false);


  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);


  const [editingMonitor, setEditingMonitor] = useState<MonitorStatus | null>(null);





  const scanOneStreaming = useCallback((monitor: MonitorConfig) => {
    setMonitors(prev => prev.map(m => m.id === monitor.id ? { ...m, loading: true, error: null } : m));
    setScanning(true);
    invoke("check_monitor_path_streaming", {
      monitorId: monitor.id,
      path: monitor.path,
      maxDepth: monitor.maxDepth || null
    });
  }, []);

  const scanAllInternal = async (list: MonitorStatus[]) => {
    setScanning(true);

    for (const m of list) {
      if (m.enabled) {
        scanOneStreaming(m);
      }
    }
  };

  const scanAll = () => scanAllInternal(monitors);

  const fetchMonitors = async () => {
    try {
      const loaded: MonitorConfig[] = await invoke("get_monitors");

      const withStatus = loaded.map(m => ({ ...m, loading: false, currentSizeBytes: 0, fileCount: 0 }));
      setMonitors(withStatus);
      return withStatus;
    } catch (e) {
      console.error("Failed to load monitors", e);
    }
  };


  useEffect(() => {
    const unlisten = listen<ScanProgress>("scan-progress", (event) => {
      const progress = event.payload;

      setMonitors(prev => {
        const updated = updateMonitorWithProgress(prev, progress);

        if (progress.done) {
          // Check if all scans are done
          const anyLoading = checkIfAnyLoading(updated);
          if (!anyLoading) setScanning(false);

          // Persist the state (especially lastScanAt)
          invoke("save_monitors", { monitors: updated }).catch(console.error);
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
      await invoke<AppSettings>("get_settings").then(setSettings);

      // Show window after UI is ready
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().show();

      // Start scans after window is visible (500ms delay)
      if (loadedMonitors && loadedMonitors.length > 0) {
        setTimeout(() => scanAllInternal(loadedMonitors), 500);
      }
    };
    init();
  }, []);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    invoke("save_settings", { settings: newSettings });
  };

  const saveToRust = async (newMonitors: MonitorConfig[]) => {
    try {
      await invoke("save_monitors", { monitors: newMonitors });
    } catch (e) {
      console.error("Failed to save", e);
    }
  };


  const handleAdd = (name: string, path: string, threshold: number) => {
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
  };

  const handleEditSave = (id: string, name: string, path: string, threshold: number, maxDepth: number | undefined, enabled: boolean) => {
    const updated = monitors.map(m => {
      if (m.id === id) {
        return {
          ...m,
          name,
          path,
          threshold,
          maxDepth,
          enabled,
          loading: enabled // Only set loading if enabled
        };
      }
      return m;
    });
    setMonitors(updated);
    saveToRust(updated);

    // Only scan if enabled
    if (enabled) {
      const idx = updated.findIndex(m => m.id === id);
      if (idx !== -1) scanOneStreaming(updated[idx]);
    }
  };

  const handleToggleNotify = (id: string) => {
    const updated = monitors.map(m => {
      if (m.id === id) {
        return { ...m, notify: !m.notify };
      }
      return m;
    });
    setMonitors(updated);
    saveToRust(updated);
  };

  const handleToggleEnabled = (id: string) => {
    let newStatus = false;
    const updated = monitors.map(m => {
      if (m.id === id) {
        newStatus = !m.enabled;
        return {
          ...m,
          enabled: newStatus,
          loading: newStatus // Set loading if enabling
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
  };

  const startEdit = (monitor: MonitorStatus) => {
    setEditingMonitor(monitor);
    openEdit();
  };

  const removeMonitor = async (id: string) => {
    const confirmed = await confirm("Stop tracking this folder?\n\n(No files will be deleted)", { title: "Confirm Removal", kind: "warning" });
    if (!confirmed) return;
    const updated = monitors.filter(m => m.id !== id);
    setMonitors(updated);
    saveToRust(updated);
  };

  const handleRestore = async () => {
    try {
      const defaults: MonitorConfig[] = await invoke("restore_defaults");
      const withStatus = defaults.map(m => ({ ...m, loading: true }));
      setMonitors(withStatus);
      setTimeout(() => scanAllInternal(withStatus), 500);
      closeSettings(); // Modalı kapat
    } catch (e) {
      console.error(e);
    }
  };


  const openFolder = (path: string) => invoke("open_monitor_path", { path }).catch(err => console.error(err));

  const handleOpenConfig = () => invoke("open_config_folder").catch(console.error);


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

  const setSorting = (field: string) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
  };

  const sortedData = useMemo(() => {
    if (!sortBy) return monitors;

    return [...monitors].sort((a, b) => {
      if (sortBy === 'usage') {
        const usageA = (a.currentSizeBytes || 0) / (a.threshold || 1);
        const usageB = (b.currentSizeBytes || 0) / (b.threshold || 1);
        return reverseSortDirection ? usageA - usageB : usageB - usageA;
      }

      if (sortBy === 'currentSizeBytes' || sortBy === 'lastScanAt') {
        const field = sortBy as keyof MonitorStatus;
        const valA = (a[field] as number || 0);
        const valB = (b[field] as number || 0);
        return reverseSortDirection
          ? valB - valA
          : valA - valB;
      }

      const field = sortBy as keyof MonitorStatus;
      const valA = (a[field] as string || "").toString().toLowerCase();
      const valB = (b[field] as string || "").toString().toLowerCase();

      return reverseSortDirection
        ? valB.localeCompare(valA)
        : valA.localeCompare(valB);
    });
  }, [monitors, sortBy, reverseSortDirection]);


  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TitleBar onOpenSettings={openSettings} minimizeToTray={settings.minimizeToTray} />


      <AddMonitorModal
        opened={addOpened}
        onClose={closeAdd}
        onAdd={handleAdd}
      />

      <EditMonitorModal
        opened={editOpened}
        onClose={closeEdit}
        monitor={editingMonitor}
        onSave={handleEditSave}
      />

      <SettingsModal
        opened={settingsOpened}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClose={closeSettings}
        onRestore={handleRestore}
        onOpenConfig={handleOpenConfig}
      />


      <AppShell padding={0} withBorder={false} footer={{ height: 26 }} style={{ flex: 1, overflow: 'hidden' }}>
        <AppShell.Main style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Container size="xl" p="md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-md)', flex: 1, minHeight: 0 }}>

              <StatsGrid
                stats={stats}
                scanning={scanning}
                onAdd={openAdd}
                onScanAll={scanAll}
              />

              <MonitorTable
                data={sortedData}
                sortBy={sortBy}
                reverseSortDirection={reverseSortDirection}
                onSort={setSorting}
                openFolder={openFolder}
                startEdit={startEdit}
                removeMonitor={removeMonitor}
                onToggleNotify={handleToggleNotify}
                onToggleEnabled={handleToggleEnabled}
                onScanOne={scanOneStreaming}
              />

            </div>
          </Container>
        </AppShell.Main>
        <AppShell.Footer withBorder={false}>
          <StatusBar
            locationCount={monitors.length}
            lastAutoCheck={lastAutoCheck}
            isScanning={scanning}
          />
        </AppShell.Footer>
      </AppShell>
    </div>
  );
}

export default App;
