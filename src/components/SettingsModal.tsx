import { Modal, Button, Group, Text, Stack, Divider, ThemeIcon, Switch, Select, NumberInput } from "@mantine/core";
import { IconDownload, IconUpload, IconReload, IconFolder, IconSettings, IconCheck, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { save, open, confirm } from '@tauri-apps/plugin-dialog';
import { AppSettings } from "../types";
import { AppColors } from "../theme";
import { api } from "../api";

interface SettingsModalProps {
    readonly opened: boolean;
    readonly settings: AppSettings;
    readonly onUpdateSettings: (s: AppSettings) => void;
    readonly onClose: () => void;
    readonly onRestore: () => void;
    readonly onOpenConfig: () => void;
}



export function SettingsModal({ opened, settings, onUpdateSettings, onClose, onRestore, onOpenConfig }: Readonly<SettingsModalProps>) {
    const presets = [15, 30, 60, 120, 240];
    const isCustom = !presets.includes(settings.checkIntervalMinutes);

    const handleExport = async () => {
        try {
            const path = await save({
                filters: [{ name: 'JSON Config', extensions: ['json'] }],
                defaultPath: 'mist_config.json'
            });
            if (path) {
                await api.exportMonitors(path);
                notifications.show({
                    title: "Success",
                    message: "Configuration exported successfully!",
                    color: "green",
                    icon: <IconCheck size={16} />
                });
            }
        } catch (error) {
            console.error(error);
            notifications.show({
                title: "Export Failed",
                message: String(error),
                color: "red",
                icon: <IconX size={16} />
            });
        }
    };

    const handleImport = async () => {
        try {
            const path = await open({
                multiple: false,
                filters: [{ name: 'JSON Config', extensions: ['json'] }]
            });
            if (path) {
                await api.importMonitors(path);
                notifications.show({
                    title: "Success",
                    message: "Configuration imported successfully! Reloading...",
                    color: "green",
                    icon: <IconCheck size={16} />
                });
                setTimeout(() => location.reload(), 1500);
            }
        } catch (error) {
            console.error(error);
            notifications.show({
                title: "Import Failed",
                message: String(error),
                color: "red",
                icon: <IconX size={16} />
            });
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={<Group gap={8}><IconSettings size={20} /><Text fw={600}>Settings</Text></Group>} centered>
            <Stack gap="lg">

                <Stack gap={8}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">Behavior</Text>
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="sm">Minimize to tray on close</Text>
                            <Text size="xs" c="dimmed">Keep Mist running in the background when the window is closed.</Text>
                        </div>
                        <Switch
                            checked={settings.minimizeToTray}
                            onChange={(event) => onUpdateSettings({ ...settings, minimizeToTray: event.currentTarget.checked })}
                        />
                    </Group>
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="sm">Background check interval</Text>
                            <Text size="xs" c="dimmed">How often to check folder sizes for notifications.</Text>
                        </div>
                        {isCustom ? (
                            <Group gap={4}>
                                <NumberInput
                                    size="xs"
                                    w={70}
                                    min={1}
                                    max={1440}
                                    suffix=" min"
                                    value={settings.checkIntervalMinutes}
                                    onChange={(value) => onUpdateSettings({ ...settings, checkIntervalMinutes: Number(value) || 60 })}
                                />
                                <Button size="xs" variant="subtle" onClick={() => onUpdateSettings({ ...settings, checkIntervalMinutes: 60 })}>x</Button>
                            </Group>
                        ) : (
                            <Select
                                size="xs"
                                w={100}
                                value={String(settings.checkIntervalMinutes)}
                                onChange={(value) => {
                                    if (value === 'custom') {
                                        onUpdateSettings({ ...settings, checkIntervalMinutes: 45 });
                                    } else {
                                        onUpdateSettings({ ...settings, checkIntervalMinutes: Number(value) });
                                    }
                                }}
                                data={[
                                    { value: '15', label: '15 min' },
                                    { value: '30', label: '30 min' },
                                    { value: '60', label: '1 hour' },
                                    { value: '120', label: '2 hours' },
                                    { value: '240', label: '4 hours' },
                                    { value: 'custom', label: 'Custom...' },
                                ]}
                            />
                        )}
                    </Group>
                </Stack>

                <Divider />


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


                    <Group justify="space-between" align="center">
                        <Group gap={8}>
                            <ThemeIcon variant="light" color={AppColors.info} size="md"><IconFolder size={16} /></ThemeIcon>
                            <Text size="sm">Config Folder</Text>
                        </Group>
                        <Button size="xs" variant="light" onClick={onOpenConfig}>Open</Button>
                    </Group>

                    <Group justify="space-between" align="center">
                        <Group gap={8}>
                            <ThemeIcon variant="light" color={AppColors.danger} size="md"><IconReload size={16} /></ThemeIcon>
                            <Text size="sm">Factory Reset</Text>
                        </Group>
                        <Button size="xs" color={AppColors.danger} variant="light" onClick={async () => { if (await confirm("Reset all monitors to default?", { title: "Factory Reset", kind: "warning" })) onRestore(); }}>Restore</Button>
                    </Group>
                </Stack>
            </Stack>
        </Modal>
    );
}
