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
    IconBan,
    IconRefresh
} from "@tabler/icons-react";
import { MonitorStatus } from "../types";
import { AppColors } from "../theme";
import { formatBytes } from "../utils";


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
        <Table.Th w={width} py={4} px="xs" bg="var(--mantine-color-default)">
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
                            <Text fw={700} size="xs" tt="uppercase" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{children}</Text>
                        </>
                    ) : (
                        <>
                            <Text fw={700} size="xs" tt="uppercase" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{children}</Text>
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
    onScanOne: (monitor: MonitorStatus) => void;
}

function formatFileCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return `${count}`;
}

function formatRelativeTime(timestamp?: number): string {
    if (!timestamp) return "Never";
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
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
    onScanOne,
}: Readonly<MonitorTableProps>) {
    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Paper
                shadow="md"
                radius="md"
                withBorder
                bg="var(--mantine-color-default)"
                style={{
                    maxHeight: '100%',
                    overflow: 'auto',
                    scrollbarGutter: 'stable',
                    marginBottom: 'var(--mantine-spacing-md)',
                    borderColor: 'var(--mantine-color-default-border)'
                }}
            >
                <Table layout="fixed" verticalSpacing={2} horizontalSpacing="xs" striped highlightOnHover stickyHeader style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <Table.Thead style={{ fontSize: 'var(--mantine-font-size-xs)' }}>
                        <Table.Tr>
                            <Table.Th w={30} py={4} px="xs" bg="var(--mantine-color-default)" style={{ borderTopLeftRadius: 'var(--mantine-radius-md)' }}></Table.Th>
                            <Table.Th w={50} py={4} px="xs" bg="var(--mantine-color-default)"></Table.Th>
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
                                sorted={sortBy === 'lastScanAt'}
                                reversed={reverseSortDirection}
                                onSort={() => onSort('lastScanAt')}
                                width={100}
                            >
                                Last Scan
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
                            <Table.Th w={40} py={4} px="xs" bg="var(--mantine-color-default)"></Table.Th>
                            <Table.Th w={40} py={4} px="xs" bg="var(--mantine-color-default)"></Table.Th>
                            <Table.Th w={40} py={4} px="xs" bg="var(--mantine-color-default)" style={{ borderTopRightRadius: 'var(--mantine-radius-md)' }}></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {data.map((m, index) => {
                            const isNotFound = m.error === "Path not found";
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
                                    <Table.Td p="xs" style={{ borderBottomLeftRadius: index === data.length - 1 ? 'var(--mantine-radius-md)' : undefined }}>
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
                                    <Table.Td fw={500} p="xs" style={{ fontSize: '0.85rem' }}>
                                        <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                            {m.name}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        <Group gap={6} wrap="nowrap">
                                            <CopyButton value={m.path} timeout={2000}>
                                                {({ copied, copy }) => (
                                                    <Tooltip label={copied ? 'Copied' : 'Click to copy'} withArrow position="right">
                                                        <Text
                                                            size="xs"
                                                            c="dimmed"
                                                            style={{ fontFamily: 'monospace', maxWidth: '100%', cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                                            {m.maxDepth && m.maxDepth > 0 && (
                                                <Tooltip label={`Scan limited to ${m.maxDepth} levels deep`}>
                                                    <Badge size="xs" variant="light" color={AppColors.info} leftSection={<IconStack size={10} />}>D:{m.maxDepth}</Badge>
                                                </Tooltip>
                                            )}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        {isNotFound ? (
                                            <Badge color={AppColors.danger} variant="light" size="xs">Not Found</Badge>
                                        ) : (
                                            <Tooltip label={`${percentage.toFixed(0)}%`} withArrow>
                                                <Progress value={percentage} color={color} size="sm" h={6} radius="xl" animated={m.loading} />
                                            </Tooltip>
                                        )}
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        <Tooltip label={m.loading ? "Scan in progress..." : (m.lastScanAt ? new Date(m.lastScanAt * 1000).toLocaleString() : "Never scanned")}>
                                            <Text size="xs" c={m.loading ? AppColors.primary : "dimmed"} fw={m.loading ? 700 : 400} style={{ whiteSpace: 'nowrap' }}>
                                                {m.loading ? "Scanning..." : formatRelativeTime(m.lastScanAt)}
                                            </Text>
                                        </Tooltip>
                                    </Table.Td>
                                    <Table.Td align="right" p="xs">
                                        {isNotFound ? (
                                            <Text size="xs" c="dimmed">-</Text>
                                        ) : (
                                            <div style={{ textAlign: 'right' }}>
                                                <Text size="sm" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                                    <span style={{ fontWeight: 700 }}>{formatBytes(m.currentSizeBytes)}</span>
                                                    {m.fileCount !== undefined && m.fileCount > 0 && (
                                                        <>
                                                            <span style={{ margin: '0 6px', color: 'var(--mantine-color-dimmed)', opacity: 0.3 }}>|</span>
                                                            <Tooltip label={`${m.fileCount.toLocaleString()} files`}>
                                                                <span style={{ fontSize: '0.85em', color: 'var(--mantine-color-dimmed)', cursor: 'help' }}>
                                                                    {formatFileCount(m.fileCount)}
                                                                </span>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </Text>
                                            </div>
                                        )}
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        <Tooltip label="Scan Now">
                                            <ActionIcon
                                                variant="subtle"
                                                color={AppColors.primary}
                                                size="sm"
                                                loading={m.loading}
                                                onClick={() => onScanOne(m)}
                                                disabled={!m.enabled}
                                            >
                                                <IconRefresh size={14} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Table.Td>
                                    <Table.Td p="xs">
                                        <Tooltip label={m.notify ? "Notifications ON" : "Notifications OFF"}>
                                            <ActionIcon variant="subtle" color={m.notify ? AppColors.warning : AppColors.neutral} size="sm" onClick={() => onToggleNotify(m.id)}>
                                                {m.notify ? <IconBell size={14} /> : <IconBellOff size={14} />}
                                            </ActionIcon>
                                        </Tooltip>
                                    </Table.Td>
                                    <Table.Td p="xs" style={{ borderBottomRightRadius: index === data.length - 1 ? 'var(--mantine-radius-md)' : undefined }}>
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
            </Paper>
        </div>
    );
}
