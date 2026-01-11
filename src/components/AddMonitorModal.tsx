import { useState } from "react";
import { Modal, Stack, TextInput, ActionIcon, NumberInput, Button } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { open as openDialog } from '@tauri-apps/plugin-dialog';

interface AddMonitorModalProps {
    opened: boolean;
    onClose: () => void;
    onAdd: (name: string, path: string, threshold: number) => void;
}

export function AddMonitorModal({ opened, onClose, onAdd }: Readonly<AddMonitorModalProps>) {
    const [path, setPath] = useState('');
    const [name, setName] = useState('');
    const [threshold, setThreshold] = useState<string | number>(1024);

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
        if (!path) return;
        onAdd(name || "New Monitor", path, Number(threshold));
        // Reset form
        setPath('');
        setName('');
        setThreshold(1024);
        onClose();
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Add New Monitor" centered>
            <Stack>
                <TextInput
                    label="Path"
                    placeholder="Click button to select folder..."
                    value={path}
                    onChange={(e) => setPath(e.currentTarget.value)}
                    rightSection={
                        <ActionIcon variant="light" onClick={handleBrowse} title="Browse Folder">
                            <IconFolder size={16} />
                        </ActionIcon>
                    }
                />
                <TextInput
                    label="Name"
                    placeholder="Folder Name (Auto-filled)"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                />
                <NumberInput label="Threshold (MB)" value={threshold} onChange={setThreshold} />
                <Button onClick={handleSubmit} mt="md">Add Monitor</Button>
            </Stack>
        </Modal>
    );
}
