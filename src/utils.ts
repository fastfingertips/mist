import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { MonitorConfig, MonitorStatus, ScanProgress } from './types';

export const formatBytes = (bytes?: number): string => {
    if (bytes === undefined) return "---";
    const mb = bytes / (1024 * 1024);
    if (mb > 1000) {
        return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
};

export const formatRelativeTime = (timestamp?: number | null): string => {
    if (!timestamp) return "Never";
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
};

export const formatFileCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return `${count}`;
};

export const handleFolderBrowse = async (
    setPath: (path: string) => void,
    setName: (name: string) => void
) => {
    try {
        const selected = await openDialog({
            directory: true,
            multiple: false,
        });

        if (selected) {
            const pathStr = selected;
            setPath(pathStr);
            const sep = pathStr.includes('\\') ? '\\' : '/';
            const parts = pathStr.split(sep).filter(p => p.length > 0);
            const autoName = parts.at(-1);
            if (autoName) setName(autoName);
        }
    } catch (error) {
        console.error("Folder selection failed:", error);
    }
};



export const updateMonitorWithProgress = (
    monitors: MonitorStatus[],
    progress: ScanProgress
): MonitorStatus[] => {
    return monitors.map(m => {
        if (m.id === progress.monitorId) {
            return {
                ...m,
                currentSizeBytes: progress.sizeBytes,
                fileCount: progress.fileCount,
                error: progress.error,
                // Only set loading to false when done, don't change it on progress updates
                loading: progress.done ? false : m.loading,
                lastScanAt: progress.lastScanAt ?? m.lastScanAt
            };
        }
        return m;
    });
};

// Generate a unique ID
export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
};

// Normalize path for comparison (lowercase, trimmed)
export const normalizePath = (path: string): string => {
    return path.toLowerCase().trim();
};

// Check if a path already exists in monitors (excluding a specific ID for edit scenarios)
export const isDuplicatePath = (
    monitors: { path: string; id: string }[],
    path: string,
    excludeId?: string
): boolean => {
    const normalized = normalizePath(path);
    return monitors.some(m =>
        (excludeId ? m.id !== excludeId : true) &&
        normalizePath(m.path) === normalized
    );
};



export const configToStatus = (monitors: MonitorConfig[]): MonitorStatus[] => {
    return monitors.map(m => ({
        ...m,
        loading: false,
        currentSizeBytes: 0,
        fileCount: 0
    }));
};

// Calculate stats from monitors
export const calculateStats = (monitors: MonitorStatus[]): { totalSize: number; criticalCount: number } => {
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
};

// Merge loaded config with existing status
export const mergeMonitors = (current: MonitorStatus[], loaded: MonitorConfig[]): MonitorStatus[] => {
    if (current.length === 0) return configToStatus(loaded);

    return loaded.map(config => {
        const existing = current.find(p => p.id === config.id);
        if (existing) {
            return {
                ...existing,
                ...config
                // Keep runtime state from 'existing'
            };
        }
        return {
            ...config,
            loading: false,
            currentSizeBytes: 0,
            fileCount: 0
        };
    });
};
