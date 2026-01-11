import { useState, useEffect } from "react";
import { Modal, Stack, TextInput, ActionIcon, NumberInput, Button } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { MonitorStatus } from "../types";

interface EditMonitorModalProps {
    opened: boolean;
    onClose: () => void;
    monitor: MonitorStatus | null;
    onSave: (id: string, name: string, path: string, threshold: number) => void;
}

export function EditMonitorModal({ opened, onClose, monitor, onSave }: EditMonitorModalProps) {
    const [path, setPath] = useState('');
    const [name, setName] = useState('');
    const [threshold, setThreshold] = useState<string | number>(1024);

    // Monitor değiştiğinde formu doldur
    useEffect(() => {
        if (monitor) {
            setPath(monitor.path);
            setName(monitor.name);
            setThreshold(monitor.threshold);
        }
    }, [monitor]);

    const handleBrowse = async () => {
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
            console.error(error);
        }
    };

    const handleSubmit = () => {
        if (!monitor || !path) return;
        onSave(monitor.id, name, path, Number(threshold));
        onClose();
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Edit Monitor" centered>
            <Stack>
                <TextInput
                    label="Path"
                    value={path}
                    onChange={(e) => setPath(e.currentTarget.value)}
                    rightSection={
                        <ActionIcon variant="light" onClick={handleBrowse} title="Browse Folder">
                            <IconFolder size={16} />
                        </ActionIcon>
                    }
                />
                <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
                <NumberInput label="Threshold (MB)" value={threshold} onChange={setThreshold} />
                <Button onClick={handleSubmit} mt="md" color="violet">Save Changes</Button>
            </Stack>
        </Modal>
    );
}
