import { Group, Text, ActionIcon, ThemeIcon, useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { IconChartPie, IconMinus, IconX, IconSun, IconMoon } from "@tabler/icons-react";
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
    const appWindow = getCurrentWindow();
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });

    const toggleColorScheme = () => {
        setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <Group h={38} px="xs" justify="space-between" style={{ userSelect: 'none', WebkitAppRegion: 'drag', backgroundColor: 'var(--mantine-color-body)' } as any}>
            <Group gap="xs" style={{ pointerEvents: 'none' }}>
                <ThemeIcon size="sm" color="violet" variant="transparent"><IconChartPie size={16} /></ThemeIcon>
                <Text size="xs" fw={700} c="dimmed">Mist</Text>
            </Group>
            <Group gap={4} style={{ WebkitAppRegion: 'no-drag' } as any}>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={toggleColorScheme}>
                    {computedColorScheme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                </ActionIcon>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => appWindow.minimize()}><IconMinus size={14} /></ActionIcon>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => appWindow.close()}><IconX size={14} /></ActionIcon>
            </Group>
        </Group>
    );
}
