import { Grid, Paper, Group, ThemeIcon, Text, Button, Menu, ActionIcon, Box } from "@mantine/core";
import { IconChartPie, IconAlertTriangle, IconPlus, IconSettings, IconDatabase, IconRefresh } from "@tabler/icons-react";

interface StatsGridProps {
    stats: {
        totalSize: number;
        criticalCount: number;
    };
    scanning: boolean;
    onAdd: () => void;
    onRestore: () => void;
    onOpenConfig: () => void;
    onScanAll: () => void;
    formatBytes: (bytes?: number) => string;
}

export function StatsGrid({ stats, scanning, onAdd, onRestore, onOpenConfig, onScanAll, formatBytes }: StatsGridProps) {
    return (
        <Grid mb="xs" gutter="xs">
            <Grid.Col span={4}>
                <Paper p="xs" radius="md" withBorder={false} bg="var(--mantine-color-default)">
                    <Group gap="xs">
                        <ThemeIcon size="md" color="violet" variant="light"><IconChartPie size={16} /></ThemeIcon>
                        <div>
                            <Text size="10px" c="dimmed" fw={700} tt="uppercase">Total Waste</Text>
                            <Text fw={700} size="sm">{formatBytes(stats.totalSize)}</Text>
                        </div>
                    </Group>
                </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
                <Paper p="xs" radius="md" withBorder={false} bg="var(--mantine-color-default)">
                    <Group gap="xs">
                        <ThemeIcon size="md" color="red" variant="light"><IconAlertTriangle size={16} /></ThemeIcon>
                        <div>
                            <Text size="10px" c="dimmed" fw={700} tt="uppercase">Critical</Text>
                            <Text fw={700} size="sm">{stats.criticalCount} Items</Text>
                        </div>
                    </Group>
                </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
                <Paper p="xs" radius="md" withBorder={false} bg="var(--mantine-color-default)" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box pl={4}> </Box>
                    <Group gap={4}>
                        <Button variant="default" size="xs" onClick={onAdd} leftSection={<IconPlus size={12} />} px={6}>Add</Button>
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="default" size="sm" h={24} w={24}><IconSettings size={14} /></ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item leftSection={<IconDatabase size={14} />} onClick={onOpenConfig}>
                                    Open Config Folder
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item leftSection={<IconRefresh size={14} />} onClick={onRestore} color="red">
                                    Restore Defaults
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                        <ActionIcon variant="light" color="violet" size="sm" h={24} w={24} onClick={onScanAll} loading={scanning}><IconRefresh size={14} /></ActionIcon>
                    </Group>
                </Paper>
            </Grid.Col>
        </Grid>
    );
}
