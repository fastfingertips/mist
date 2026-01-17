import { ActionIcon, Button, Group, NumberInput, Stack, Switch, Text, TextInput, Tooltip } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { AppColors } from "../theme";
import { handleFolderBrowse } from "../utils";

interface MonitorFormProps {
    initialValues?: {
        name: string;
        path: string;
        threshold: number;
        maxDepth: number | undefined;
        enabled: boolean;
    };
    submitLabel: string;
    onSubmit: (values: {
        name: string;
        path: string;
        threshold: number;
        maxDepth: number | undefined;
        enabled: boolean;
    }) => void;
    showExtendedFields?: boolean;
}

export function MonitorForm({ initialValues, submitLabel, onSubmit, showExtendedFields = false }: MonitorFormProps) {
    const [path, setPath] = useState(initialValues?.path || '');
    const [name, setName] = useState(initialValues?.name || '');
    const [threshold, setThreshold] = useState<string | number>(initialValues?.threshold || 1024);
    const [maxDepth, setMaxDepth] = useState<string | number>(initialValues?.maxDepth || '');
    const [enabled, setEnabled] = useState(initialValues?.enabled ?? true);

    useEffect(() => {
        if (initialValues) {
            setPath(initialValues.path);
            setName(initialValues.name);
            setThreshold(initialValues.threshold);
            setMaxDepth(initialValues.maxDepth || '');
            setEnabled(initialValues.enabled);
        }
    }, [initialValues]);

    const handleSubmit = () => {
        if (!path) return;
        const depthValue = maxDepth === '' || maxDepth === 0 ? undefined : Number(maxDepth);
        onSubmit({
            name: name || "New Monitor",
            path,
            threshold: Number(threshold),
            maxDepth: depthValue,
            enabled
        });
    };

    return (
        <Stack>
            <TextInput
                label="Path"
                placeholder="Click button to select folder..."
                value={path}
                onChange={(e) => setPath(e.currentTarget.value)}
                rightSection={
                    <ActionIcon
                        variant="light"
                        color={AppColors.primary}
                        onClick={() => handleFolderBrowse(setPath, setName)}
                        title="Browse Folder"
                    >
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
            <NumberInput
                label="Threshold (MB)"
                value={threshold}
                onChange={setThreshold}
                min={1}
            />

            {showExtendedFields && (
                <>
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
                </>
            )}

            <Button onClick={handleSubmit} mt="md" color={AppColors.primary}>
                {submitLabel}
            </Button>
        </Stack>
    );
}
