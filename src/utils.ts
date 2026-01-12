import { open as openDialog } from '@tauri-apps/plugin-dialog';

export const formatBytes = (bytes?: number): string => {
    if (bytes === undefined) return "---";
    const mb = bytes / (1024 * 1024);
    if (mb > 1000) {
        return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
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
