import { Group, Text, ActionIcon, ThemeIcon, useMantineColorScheme, Tooltip } from "@mantine/core";
import { IconChartPie, IconMinus, IconX, IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
    const appWindow = getCurrentWindow();
    const { colorScheme, setColorScheme, clearColorScheme } = useMantineColorScheme();

    const toggleColorScheme = () => {
        if (colorScheme === 'auto') {
            setColorScheme('light');
        } else if (colorScheme === 'light') {
            setColorScheme('dark');
        } else {
            clearColorScheme(); // Sets to auto
        }
    };

    const getThemeIcon = () => {
        if (colorScheme === 'auto') return <IconDeviceDesktop size={14} />;
        if (colorScheme === 'light') return <IconSun size={14} />;
        return <IconMoon size={14} />;
    };

    const getThemeLabel = () => {
        if (colorScheme === 'auto') return "System Theme";
        if (colorScheme === 'light') return "Light Mode";
        return "Dark Mode";
    };

    return (
        <Group h={38} px="xs" justify="space-between" style={{ userSelect: 'none', WebkitAppRegion: 'drag', backgroundColor: 'var(--mantine-color-body)' } as any}>
            <Group gap="xs" style={{ pointerEvents: 'none' }}>
                <ThemeIcon size="sm" color="violet" variant="transparent"><IconChartPie size={16} /></ThemeIcon>
                <Text size="xs" fw={700} c="dimmed">Mist</Text>
            </Group>
            <Group gap={4} style={{ WebkitAppRegion: 'no-drag' } as any}>
                <Tooltip label={getThemeLabel()} openDelay={500}>
                    <ActionIcon variant="subtle" color="gray" size="sm" onClick={toggleColorScheme}>
                        {getThemeIcon()}
                    </ActionIcon>
                </Tooltip>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => appWindow.minimize()}><IconMinus size={14} /></ActionIcon>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => appWindow.close()}><IconX size={14} /></ActionIcon>
            </Group>
        </Group>
    );
}
