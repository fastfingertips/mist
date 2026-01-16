import { Grid, Paper, Group, ThemeIcon, Text, Button, ActionIcon, Box } from "@mantine/core";
import { IconChartPie, IconAlertTriangle, IconPlus, IconRefresh } from "@tabler/icons-react";
import { AppColors } from "../theme";
import { formatBytes } from "../utils";

interface StatsGridProps {
    stats: {
        totalSize: number;
        criticalCount: number;
    };
    scanning: boolean;
    onAdd: () => void;
    onScanAll: () => void;
}

export function StatsGrid({ stats, scanning, onAdd, onScanAll }: Readonly<StatsGridProps>) {
    return (
        <Box p="calc(var(--mantine-spacing-md) / 2)">
            <Grid gutter="md">
                <Grid.Col span={4}>
                    <Paper p="xs" radius="md" withBorder={false} bg="var(--mantine-color-default)">
                        <Group gap="xs">
                            <ThemeIcon size="md" color={AppColors.primary} variant="light"><IconChartPie size={16} /></ThemeIcon>
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
                            <ThemeIcon size="md" color={AppColors.danger} variant="light"><IconAlertTriangle size={16} /></ThemeIcon>
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
                            <Button variant="default" size="xs" onClick={onAdd} leftSection={<IconPlus size={12} />} px={8}>Add Monitor</Button>
                            <ActionIcon variant="light" color={AppColors.primary} size="sm" h={24} w={24} onClick={onScanAll} disabled={scanning}>
                                <IconRefresh size={14} className={scanning ? 'spin' : ''} />
                            </ActionIcon>
                        </Group>
                    </Paper>
                </Grid.Col>
            </Grid>
        </Box>
    );
}
