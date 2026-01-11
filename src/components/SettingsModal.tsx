import { Modal, Button, Group, Text, Stack, Divider, ThemeIcon, Switch } from "@mantine/core";
import { IconDownload, IconUpload, IconReload, IconFolder, IconSettings, IconMinusVertical } from "@tabler/icons-react";
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { AppSettings } from "../types";

interface SettingsModalProps {
    readonly opened: boolean;
    readonly settings: AppSettings;
    readonly onUpdateSettings: (s: AppSettings) => void;
    readonly onClose: () => void;
    readonly onRestore: () => void;
    readonly onOpenConfig: () => void;
}

export function SettingsModal({ opened, settings, onUpdateSettings, onClose, onRestore, onOpenConfig }: Readonly<SettingsModalProps>) {

    const handleExport = async () => {
        try {
            const path = await save({
                filters: [{ name: 'JSON Config', extensions: ['json'] }],
                defaultPath: 'mist_config.json'
            });
            if (path) {
                await invoke('export_monitors', { path });
                alert("Configuration exported successfully!");
            }
        } catch (error) {
            console.error(error);
            alert("Export failed: " + error);
        }
    };

    const handleImport = async () => {
        try {
            const path = await open({
                multiple: false,
                filters: [{ name: 'JSON Config', extensions: ['json'] }]
            });
            if (path) {
                await invoke('import_monitors', { path });
                alert("Configuration imported successfully! Reloading...");
                location.reload();
            }
        } catch (error) {
            console.error(error);
            alert("Import failed: " + error);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={<Group gap={8}><IconSettings size={20} /><Text fw={600}>Settings</Text></Group>} centered>
            <Stack gap="lg">
                {/* Behavior Section */}
                <Stack gap={8}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">Behavior</Text>
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="sm">Minimize to tray on close</Text>
                            <Text size="xs" c="dimmed">Keep Mist running in the background when the window is closed.</Text>
                        </div>
                        <Switch
                            checked={settings.minimize_to_tray}
                            onChange={(event) => onUpdateSettings({ ...settings, minimize_to_tray: event.currentTarget.checked })}
                        />
                    </Group>
                </Stack>

                <Divider />

                {/* Data Management Section */}
                <Stack gap={8}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">Configuration</Text>
                    <Group grow>
                        <Button leftSection={<IconDownload size={16} />} variant="default" onClick={handleImport}>Import</Button>
                        <Button leftSection={<IconUpload size={16} />} variant="default" onClick={handleExport}>Export</Button>
                    </Group>
                </Stack>

                <Divider />

                {/* System Section */}
                <Stack gap={8}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">System</Text>

                    <Group justify="space-between" align="center">
                        <Group gap={8}>
                            <ThemeIcon variant="light" color="blue" size="md"><IconFolder size={16} /></ThemeIcon>
                            <Text size="sm">Config Folder</Text>
                        </Group>
                        <Button size="xs" variant="light" onClick={onOpenConfig}>Open</Button>
                    </Group>

                    <Group justify="space-between" align="center">
                        <Group gap={8}>
                            <ThemeIcon variant="light" color="red" size="md"><IconReload size={16} /></ThemeIcon>
                            <Text size="sm">Factory Reset</Text>
                        </Group>
                        <Button size="xs" color="red" variant="subtle" onClick={() => { if (confirm("Reset all monitors to default?")) onRestore(); }}>Restore</Button>
                    </Group>
                </Stack>
            </Stack>
        </Modal>
    );
}
