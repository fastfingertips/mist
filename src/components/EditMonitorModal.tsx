import { useState, useEffect } from "react";
import { Modal, Stack, TextInput, ActionIcon, NumberInput, Button, Tooltip, Switch, Group, Text } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { MonitorStatus } from "../types";
import { AppColors } from "../theme";
import { handleFolderBrowse } from "../utils";

interface EditMonitorModalProps {
    opened: boolean;
    onClose: () => void;
    monitor: MonitorStatus | null;
    onSave: (id: string, name: string, path: string, threshold: number, maxDepth: number | undefined, enabled: boolean) => void;
}

export function EditMonitorModal({ opened, onClose, monitor, onSave }: Readonly<EditMonitorModalProps>) {
    const [path, setPath] = useState('');
    const [name, setName] = useState('');
    const [threshold, setThreshold] = useState<string | number>(1024);
    const [maxDepth, setMaxDepth] = useState<string | number>('');
    const [enabled, setEnabled] = useState(true);

    // Monitor değiştiğinde formu doldur
    useEffect(() => {
        if (monitor) {
            setPath(monitor.path);
            setName(monitor.name);
            setThreshold(monitor.threshold);
            setMaxDepth(monitor.max_depth || '');
            setEnabled(monitor.enabled);
        }
    }, [monitor]);

    const handleSubmit = () => {
        if (!monitor || !path) return;
        const depthValue = maxDepth === '' || maxDepth === 0 ? undefined : Number(maxDepth);
        onSave(monitor.id, name, path, Number(threshold), depthValue, enabled);
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
                        <ActionIcon variant="light" color={AppColors.primary} onClick={() => handleFolderBrowse(setPath, setName)} title="Browse Folder">
                            <IconFolder size={16} />
                        </ActionIcon>
                    }
                />
                <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
                <NumberInput label="Threshold (MB)" value={threshold} onChange={setThreshold} min={1} />
                <Tooltip label="0 or empty = Unlimited depth (full scan)" position="top-start">
                    <NumberInput
                        label="Scan Depth"
                        description="Limit how deep to scan. 0 = unlimited"
                        value={maxDepth}
                        onChange={setMaxDepth}
                        min={0}
                        max={100}
                        placeholder="Unlimited"
                    />
                </Tooltip>
                <Group justify="space-between" align="center" mt="xs">
                    <div>
                        <Text size="sm">Enabled</Text>
                        <Text size="xs" c="dimmed">Include this folder in scans</Text>
                    </div>
                    <Switch
                        checked={enabled}
                        onChange={(e) => setEnabled(e.currentTarget.checked)}
                    />
                </Group>
                <Button onClick={handleSubmit} mt="md" color={AppColors.primary}>Save Changes</Button>
            </Stack>
        </Modal>
    );
}
