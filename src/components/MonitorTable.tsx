import React from "react";
import {
    Table,
    Text,
    Group,
    ActionIcon,
    Tooltip,
    Progress,
    ThemeIcon,
    Loader,
    UnstyledButton,
    Center,
    rem,
    Menu,
    ScrollArea,
    Paper,
    CopyButton,
    Badge,
    Switch
} from "@mantine/core";
import {
    IconCheck,
    IconX,
    IconAlertTriangle,
    IconFolderOpen,
    IconDots,
    IconEdit,
    IconTrash,
    IconSelector,
    IconChevronDown,
    IconChevronUp,
    IconBell,
    IconBellOff,
    IconStack,
    IconBan
} from "@tabler/icons-react";
import { MonitorStatus } from "../types";
import { AppColors } from "../theme";
import { formatBytes } from "../utils";

// Th Component
interface ThProps {
    readonly children: React.ReactNode;
    readonly reversed: boolean;
    readonly sorted: boolean;
    readonly onSort: () => void;
    readonly width?: number | string;
    readonly align?: 'left' | 'right' | 'center';
}

function Th({ children, reversed, sorted, onSort, width, align }: ThProps) {
    let IconComponent = IconSelector;
    if (sorted) {
        IconComponent = reversed ? IconChevronUp : IconChevronDown;
    }

    return (
        <Table.Th w={width} p="xs">
            <UnstyledButton onClick={onSort} style={{ width: '100%' }}>
                <Group justify={align === 'right' ? 'flex-end' : 'space-between'} wrap="nowrap" gap={4}>
                    {align === 'right' ? (
                        <>
                            <Center>
                                <IconComponent
                                    style={{ width: rem(12), height: rem(12) }}
                                    stroke={1.5}
                                    color={sorted ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-dimmed)'}
                                />
                            </Center>
                            <Text fw={700} size="xs" tt="uppercase" c="dimmed">{children}</Text>
                        </>
                    ) : (
                        <>
                            <Text fw={700} size="xs" tt="uppercase" c="dimmed">{children}</Text>
                            <Center>
                                <IconComponent
                                    style={{ width: rem(12), height: rem(12) }}
                                    stroke={1.5}
                                    color={sorted ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-dimmed)'}
                                />
                            </Center>
                        </>
                    )}
                </Group>
            </UnstyledButton>
        </Table.Th>
    );
}

// Main Table Component
interface MonitorTableProps {
    data: MonitorStatus[];
    sortBy: string | null;
    reverseSortDirection: boolean;
    onSort: (field: string) => void;
    openFolder: (path: string) => void;
    startEdit: (monitor: MonitorStatus) => void;
    removeMonitor: (id: string) => void;
    onToggleNotify: (id: string) => void;
    onToggleEnabled: (id: string) => void;
}

function formatFileCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M files`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K files`;
    return `${count} files`;
}

export function MonitorTable({
    data,
    sortBy,
    reverseSortDirection,
    onSort,
    openFolder,
    startEdit,
    removeMonitor,
    onToggleNotify,
    onToggleEnabled,
}: Readonly<MonitorTableProps>) {
    const viewportRef = React.useRef<HTMLDivElement>(null);
    const [showScrollHint, setShowScrollHint] = React.useState(false);

    const checkScroll = React.useCallback(() => {
        if (viewportRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
            // Show hint if scrollable AND not at bottom (with 5px threshold)
            const isScrollable = scrollHeight > clientHeight + 1;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
            setShowScrollHint(isScrollable && !isAtBottom);
        }
    }, []);

    React.useEffect(() => {
        // Initial check and on data changes
        checkScroll();

        // Add listener for manual scrolls
        const viewport = viewportRef.current;
        if (viewport) {
            viewport.addEventListener('scroll', checkScroll);
            return () => viewport.removeEventListener('scroll', checkScroll);
        }
    }, [data, checkScroll]);

    // Also check on window resize
    React.useEffect(() => {
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [checkScroll]);

    return (
        <Paper withBorder={false} radius="md" style={{ flex: '0 1 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ScrollArea.Autosize viewportRef={viewportRef} mah="100%" scrollbars="y" type="scroll" viewportProps={{ style: { paddingBottom: 16 } }}>
                <Table verticalSpacing={4} horizontalSpacing="xs" striped highlightOnHover stickyHeader>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th w={30} p="xs"></Table.Th>
                            <Table.Th w={50} p="xs"></Table.Th>
                            <Th
                                sorted={sortBy === 'name'}
                                reversed={reverseSortDirection}
                                onSort={() => onSort('name')}
                                width={180}
                            >
                                Name
                            </Th>
                            <Th
                                sorted={sortBy === 'path'}
                                reversed={reverseSortDirection}
                                onSort={() => onSort('path')}
                            >
                                Path
                            </Th>
                            <Th
                                sorted={sortBy === 'usage'}
                                reversed={reverseSortDirection}
                                onSort={() => onSort('usage')}
                                width={120}
                            >
                                Usage
                            </Th>
                            <Th
                                sorted={sortBy === 'currentSizeBytes'}
                                reversed={reverseSortDirection}
                                onSort={() => onSort('currentSizeBytes')}
                                width={100}
                                align="right"
                            >
                                Size
                            </Th>
                            <Table.Th w={40} p="xs"></Table.Th>
                            <Table.Th w={40} p="xs"></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {data.map((m) => {
                            const isNotFound = m.error === "Path not found"; // Added for path not found error
                            const currentMB = (m.currentSizeBytes || 0) / (1024 * 1024);
                            const percentage = Math.min(100, (currentMB / m.threshold) * 100);
                            let color = AppColors.success;
                            let statusIcon = <IconCheck size={12} />;
                            if (!m.enabled) {
                                statusIcon = <IconBan size={12} />;
                                color = AppColors.neutral;
                            } else if (m.loading) {
                                statusIcon = <Loader size={10} />;
                                color = AppColors.neutral;
                            } else if (m.error) {
                                color = AppColors.danger;
                                statusIcon = <IconX size={12} />;
                            } else if (currentMB > m.threshold) {
                                color = AppColors.danger;
                                statusIcon = <IconAlertTriangle size={12} />;
                            } else if (currentMB > m.threshold * 0.8) {
                                color = AppColors.warning;
                                statusIcon = <IconAlertTriangle size={12} />;
                            }

                            return (
                                <Table.Tr key={m.id} style={{ opacity: (m.enabled && !isNotFound) ? 1 : 0.6, filter: m.enabled ? 'none' : 'grayscale(100%)' }}>
                                    <Table.Td p="xs">
                                        <Tooltip label={m.enabled ? (m.error || "OK") : "Disabled"}>
                                            <ThemeIcon color={color} variant="light" size="sm" h={20} w={20} radius="xl">{statusIcon}</ThemeIcon>
                                        </Tooltip>
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        <Switch
                                            checked={m.enabled}
                                            onChange={() => onToggleEnabled(m.id)}
                                            size="xs"
                                            color={AppColors.primary}
                                            styles={{ input: { cursor: 'pointer' } }}
                                        />
                                    </Table.Td>
                                    <Table.Td fw={500} p="xs" style={{ fontSize: '0.85rem' }}>{m.name}</Table.Td>
                                    <Table.Td p="xs">
                                        <Group gap={6} wrap="nowrap">
                                            <CopyButton value={m.path} timeout={2000}>
                                                {({ copied, copy }) => (
                                                    <Tooltip label={copied ? 'Copied' : 'Click to copy'} withArrow position="right">
                                                        <Text
                                                            size="xs"
                                                            c="dimmed"
                                                            style={{ fontFamily: 'monospace', maxWidth: 400, cursor: 'pointer' }}
                                                            truncate="end"
                                                            onClick={copy}
                                                        >
                                                            {m.path}
                                                        </Text>
                                                    </Tooltip>
                                                )}
                                            </CopyButton>
                                            <ActionIcon variant="transparent" color={AppColors.neutral} size="xs" onClick={() => openFolder(m.path)}>
                                                <IconFolderOpen size={14} />
                                            </ActionIcon>
                                            {m.max_depth && m.max_depth > 0 && (
                                                <Tooltip label={`Scan limited to ${m.max_depth} levels deep`}>
                                                    <Badge size="xs" variant="light" color={AppColors.info} leftSection={<IconStack size={10} />}>D:{m.max_depth}</Badge>
                                                </Tooltip>
                                            )}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        {isNotFound ? (
                                            <Badge color={AppColors.danger} variant="light" size="xs">Not Found</Badge>
                                        ) : (
                                            <Tooltip label={`${percentage.toFixed(0)}%`} withArrow>
                                                <Progress value={percentage} color={color} size="sm" h={6} radius="xl" animated={m.loading || currentMB > m.threshold} />
                                            </Tooltip>
                                        )}
                                    </Table.Td>
                                    <Table.Td align="right" p="xs">
                                        {isNotFound ? (
                                            <Text size="xs" c="dimmed">—</Text>
                                        ) : (
                                            <div style={{ textAlign: 'right' }}>
                                                <Text size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                                                    {formatBytes(m.currentSizeBytes)}
                                                </Text>
                                                {m.fileCount !== undefined && m.fileCount > 0 && (
                                                    <Tooltip label={`${m.fileCount.toLocaleString()} files`}>
                                                        <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums', cursor: 'help', lineHeight: 1 }}>
                                                            {formatFileCount(m.fileCount)}
                                                        </Text>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        )}
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        <Tooltip label={m.notify ? "Notifications ON" : "Notifications OFF"}>
                                            <ActionIcon variant="subtle" color={m.notify ? AppColors.warning : AppColors.neutral} size="sm" onClick={() => onToggleNotify(m.id)}>
                                                {m.notify ? <IconBell size={14} /> : <IconBellOff size={14} />}
                                            </ActionIcon>
                                        </Tooltip>
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        <Menu shadow="md" width={160} position="bottom-end">
                                            <Menu.Target><ActionIcon variant="subtle" color={AppColors.neutral} size="sm"><IconDots size={14} /></ActionIcon></Menu.Target>
                                            <Menu.Dropdown>
                                                <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => startEdit(m)}>Edit Settings</Menu.Item>
                                                <Menu.Item color={AppColors.danger} leftSection={<IconTrash size={14} />} onClick={() => removeMonitor(m.id)}>Stop Tracking</Menu.Item>
                                            </Menu.Dropdown>
                                        </Menu>
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            </ScrollArea.Autosize>

            <Group justify="space-between" px="xs" py={6} bg="var(--mantine-color-default)" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                <Text size="10px" c="dimmed" fw={700} tt="uppercase">
                    Tracking {data.length} {data.length === 1 ? 'Location' : 'Locations'}
                </Text>
                {showScrollHint && (
                    <Text size="10px" c={AppColors.primary} fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                        ↓ Scroll for more
                    </Text>
                )}
            </Group>
        </Paper>
    );
}
