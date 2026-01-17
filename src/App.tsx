import { useState, useMemo } from "react";
import { AppShell, Container } from "@mantine/core";
import { useDisclosure } from '@mantine/hooks';
import "./App.css";

import { MonitorStatus } from "./types";
import { api } from "./api";
import { useMonitors } from "./hooks/useMonitors";
import { TitleBar } from "./components/TitleBar";
import { StatsGrid } from "./components/StatsGrid";
import { MonitorTable } from "./components/MonitorTable";
import { AddMonitorModal } from "./components/AddMonitorModal";
import { EditMonitorModal } from "./components/EditMonitorModal";
import { SettingsModal } from "./components/SettingsModal";
import { StatusBar } from "./components/StatusBar";

function App() {
  const {
    monitors,
    scanning,
    settings,
    lastAutoCheck,
    stats,
    actions
  } = useMonitors();

  const [sortBy, setSortBy] = useState<string | null>('name');
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);

  const [editingMonitor, setEditingMonitor] = useState<MonitorStatus | null>(null);

  const startEdit = (monitor: MonitorStatus) => {
    setEditingMonitor(monitor);
    openEdit();
  };

  const handleRestore = async () => {
    await actions.handleRestore();
    closeSettings();
  };

  const openFolder = (path: string) => api.openMonitorPath(path).catch(err => console.error(err));
  const handleOpenConfig = () => api.openConfigFolder().catch(console.error);

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
        return reverseSortDirection ? valB - valA : valA - valB;
      }

      const field = sortBy as keyof MonitorStatus;
      const valA = (a[field] as string || "").toString().toLowerCase();
      const valB = (b[field] as string || "").toString().toLowerCase();

      return reverseSortDirection ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });
  }, [monitors, sortBy, reverseSortDirection]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TitleBar onOpenSettings={openSettings} minimizeToTray={settings.minimizeToTray} />

      <AddMonitorModal
        opened={addOpened}
        onClose={closeAdd}
        onAdd={actions.handleAdd}
      />

      <EditMonitorModal
        opened={editOpened}
        onClose={closeEdit}
        monitor={editingMonitor}
        onSave={actions.handleEditSave}
      />

      <SettingsModal
        opened={settingsOpened}
        settings={settings}
        onUpdateSettings={actions.handleUpdateSettings}
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
                onScanAll={actions.scanAll}
              />

              <MonitorTable
                data={sortedData}
                sortBy={sortBy}
                reverseSortDirection={reverseSortDirection}
                onSort={setSorting}
                openFolder={openFolder}
                startEdit={startEdit}
                removeMonitor={actions.removeMonitor}
                onToggleNotify={actions.handleToggleNotify}
                onToggleEnabled={actions.handleToggleEnabled}
                onScanOne={actions.scanOneStreaming}
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
