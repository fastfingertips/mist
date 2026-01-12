
import { Group, Text, ActionIcon, ThemeIcon, useMantineColorScheme, useComputedColorScheme, Tooltip } from "@mantine/core";
import { IconChartPie, IconMinus, IconX, IconSun, IconMoon, IconSettings } from "@tabler/icons-react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppColors } from "../theme";

interface TitleBarProps {
    readonly onOpenSettings: () => void;
    readonly minimizeToTray: boolean;
}

export function TitleBar({ onOpenSettings, minimizeToTray }: Readonly<TitleBarProps>) {
    const appWindow = getCurrentWindow();
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });

    const toggleColorScheme = () => {
        setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
    };

    const getThemeIcon = () => {
        return computedColorScheme === 'dark' ? <IconMoon size={14} /> : <IconSun size={14} />;
    };

    const getThemeLabel = () => {
        return computedColorScheme === 'dark' ? "Dark Mode" : "Light Mode";
    };

    return (
        <Group h={38} px="xs" justify="space-between" style={{ userSelect: 'none', WebkitAppRegion: 'drag', backgroundColor: 'var(--mantine-color-body)' } as any}>
            <Group gap="xs" style={{ pointerEvents: 'none' }}>
                <ThemeIcon size="sm" color={AppColors.primary} variant="transparent"><IconChartPie size={16} /></ThemeIcon>
                <Text size="xs" fw={700} c="dimmed">Mist</Text>
            </Group>
            <Group gap={4} style={{ WebkitAppRegion: 'no-drag' } as any}>
                <Tooltip label="Settings" openDelay={500}>
                    <ActionIcon variant="subtle" color={AppColors.neutral} size="sm" onClick={onOpenSettings}>
                        <IconSettings size={14} />
                    </ActionIcon>
                </Tooltip>
                <Tooltip label={getThemeLabel()} openDelay={500}>
                    <ActionIcon variant="subtle" color={AppColors.neutral} size="sm" onClick={toggleColorScheme}>
                        {getThemeIcon()}
                    </ActionIcon>
                </Tooltip>
                <ActionIcon variant="subtle" color={AppColors.neutral} size="sm" onClick={() => appWindow.minimize()}><IconMinus size={14} /></ActionIcon>
                <Tooltip label={minimizeToTray ? "Minimize to Tray" : "Close"} openDelay={500}>
                    <ActionIcon variant="subtle" color={minimizeToTray ? AppColors.neutral : AppColors.danger} size="sm" onClick={() => appWindow.close()}>
                        <IconX size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Group>
    );
}
