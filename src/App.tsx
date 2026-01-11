import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AppShell,
  Container,
} from "@mantine/core";
import { useDisclosure } from '@mantine/hooks';
import "./App.css";

// Components & Types
import { MonitorConfig, MonitorStatus } from "./types";
import { TitleBar } from "./components/TitleBar";
import { StatsGrid } from "./components/StatsGrid";
import { MonitorTable } from "./components/MonitorTable";
import { AddMonitorModal } from "./components/AddMonitorModal";
import { EditMonitorModal } from "./components/EditMonitorModal";

function App() {
  const [monitors, setMonitors] = useState<MonitorStatus[]>([]);
  const [scanning, setScanning] = useState(false);

  // Sorting State
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  // Modals
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  // Editing State
  const [editingMonitor, setEditingMonitor] = useState<MonitorStatus | null>(null);


  // --- SCAN FUNCTIONS (Defined first so handlers can use them) ---
  const scanOne = async (index: number, monitor: MonitorConfig) => {
    try {
      const result: any = await invoke("check_monitor_path", { path: monitor.path });
      setMonitors(prev => {
        const newMonitors = [...prev];
        if (newMonitors[index]) {
          newMonitors[index] = {
            ...newMonitors[index],
            currentSizeBytes: result.size_bytes,
            error: result.error,
            loading: false
          };
        }
        return newMonitors;
      });
    } catch (e: any) {
      console.error("Scan failed for monitor index " + index, e);
      setMonitors(prev => {
        const newMonitors = [...prev];
        if (newMonitors[index]) newMonitors[index] = { ...newMonitors[index], error: "Failed", loading: false };
        return newMonitors;
      });
    }
  };

  const scanAllInternal = async (list: MonitorStatus[]) => {
    setScanning(true);
    const promises = list.map((m, index) => scanOne(index, m));
    await Promise.all(promises);
    setScanning(false);
  };

  const scanAll = () => scanAllInternal(monitors);

  const fetchMonitors = async () => {
    try {
      const loaded: MonitorConfig[] = await invoke("get_monitors");
      setMonitors(loaded.map(m => ({ ...m, loading: true })));
      setTimeout(() => scanAllInternal(loaded.map(m => ({ ...m, loading: true }))), 500);
    } catch (e) {
      console.error("Failed to load monitors", e);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const saveToRust = async (newMonitors: MonitorConfig[]) => {
    try {
      const cleanMonitors = newMonitors.map(({ id, name, path, threshold, enabled, notify }) => ({
        id, name, path, threshold, enabled, notify
      }));
      await invoke("save_monitors", { monitors: cleanMonitors });
    } catch (e) {
      console.error("Failed to save", e);
    }
  };

  // --- HANDLERS ---
  const handleAdd = (name: string, path: string, threshold: number) => {
    const newMonitor: MonitorConfig = {
      id: Date.now().toString(),
      name,
      path,
      threshold,
      enabled: true,
      notify: true
    };

    const updated = [...monitors, { ...newMonitor, loading: true }];
    setMonitors(updated);
    saveToRust(updated);
    scanOne(updated.length - 1, newMonitor);
  };

  const handleEditSave = (id: string, name: string, path: string, threshold: number) => {
    const updated = monitors.map(m => {
      if (m.id === id) {
        return {
          ...m,
          name,
          path,
          threshold,
          loading: true
        };
      }
      return m;
    });
    setMonitors(updated);
    saveToRust(updated);

    const idx = updated.findIndex(m => m.id === id);
    if (idx !== -1) scanOne(idx, updated[idx]);
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

  const startEdit = (monitor: MonitorStatus) => {
    setEditingMonitor(monitor);
    openEdit();
  };

  const removeMonitor = (id: string) => {
    if (!confirm("Stop tracking this folder? (No files will be deleted)")) return;
    const updated = monitors.filter(m => m.id !== id);
    setMonitors(updated);
    saveToRust(updated);
  };

  const handleRestore = async () => {
    if (confirm("Are you sure? This will load default monitors.")) {
      try {
        const defaults: MonitorConfig[] = await invoke("restore_defaults");
        const withStatus = defaults.map(m => ({ ...m, loading: true }));
        setMonitors(withStatus);
        setTimeout(() => scanAllInternal(withStatus), 500);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // --- HELPERS ---
  const openFolder = (path: string) => invoke("open_monitor_path", { path }).catch(err => console.error(err));

  const handleOpenConfig = () => invoke("open_config_folder").catch(console.error);

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return "---";
    const mb = bytes / (1024 * 1024);
    if (mb > 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
  };

  // --- SORTING ---
  const stats = useMemo(() => {
    let totalSize = 0;
    let criticalCount = 0;
    monitors.forEach(m => {
      if (m.currentSizeBytes) totalSize += m.currentSizeBytes;
      const mb = (m.currentSizeBytes || 0) / (1024 * 1024);
      if (mb > m.threshold) criticalCount++;
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

      if (sortBy === 'currentSizeBytes') {
        return reverseSortDirection
          ? (b.currentSizeBytes || 0) - (a.currentSizeBytes || 0)
          : (a.currentSizeBytes || 0) - (b.currentSizeBytes || 0);
      }

      // @ts-ignore
      const valA = (a[sortBy] as string || "").toString().toLowerCase();
      // @ts-ignore
      const valB = (b[sortBy] as string || "").toString().toLowerCase();

      return reverseSortDirection
        ? valB.localeCompare(valA)
        : valA.localeCompare(valB);
    });
  }, [monitors, sortBy, reverseSortDirection]);


  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TitleBar />

      {/* MODALS */}
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

      {/* Main Content Area */}
      <AppShell style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} padding="sm" withBorder={false}>
        <AppShell.Main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <Container size="xl" p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <StatsGrid
              stats={stats}
              scanning={scanning}
              onAdd={openAdd}
              onRestore={handleRestore}
              onOpenConfig={handleOpenConfig}
              onScanAll={scanAll}
              formatBytes={formatBytes}
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
              formatBytes={formatBytes}
            />

          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}

export default App;
