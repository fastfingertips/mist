import { Group, Text, rem, Anchor } from "@mantine/core";
import {
    IconFolder,
    IconHistory,
    IconBrandGithub,
    IconCircleCheck,
    IconLoader2,
    IconBug,
    IconUser
} from "@tabler/icons-react";
import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useState } from 'react';
import { AppColors } from "../theme";
import { formatRelativeTime } from "../utils";

interface StatusBarProps {
    readonly locationCount: number;
    readonly lastAutoCheck: number | null;
    readonly isScanning: boolean;
}

export function StatusBar({ locationCount, lastAutoCheck, isScanning }: StatusBarProps) {
    const [version, setVersion] = useState('');

    useEffect(() => {
        getVersion().then(setVersion).catch(console.error);
    }, []);



    return (
        <Group
            justify="space-between"
            h={26}
            px="sm"
            bg={AppColors.primary}
            c="white"
            style={{
                fontSize: rem(10.5),
                fontWeight: 600,
                letterSpacing: '0.02em',
                userSelect: 'none'
            }}
        >
            <Group gap="lg">
                <Group gap={6} style={{ cursor: 'default' }}>
                    {isScanning ? (
                        <IconLoader2 size={13} style={{ animation: 'spin 2s linear infinite' }} />
                    ) : (
                        <IconCircleCheck size={13} />
                    )}
                    <Text size="10.5px" fw={600} tt="uppercase">
                        {isScanning ? 'Scanning...' : 'Ready'}
                    </Text>
                </Group>

                <Group gap={6} style={{ cursor: 'default' }}>
                    <IconFolder size={13} />
                    <Text size="10.5px" fw={600} tt="uppercase">
                        {locationCount} {locationCount === 1 ? 'Location' : 'Locations'}
                    </Text>
                </Group>

                {lastAutoCheck && (
                    <Group gap={6} style={{ cursor: 'default', opacity: 0.8 }}>
                        <IconHistory size={13} />
                        <Text size="10.5px" fw={600} tt="uppercase">
                            Last Check: {formatRelativeTime(lastAutoCheck)}
                        </Text>
                    </Group>
                )}
            </Group>

            <Group gap="md">
                {version && (
                    <Text size="10.5px" fw={600} tt="uppercase" style={{ opacity: 0.8, marginRight: rem(8) }}>
                        v{version}
                    </Text>
                )}

                <Anchor
                    href="https://github.com/fastfingertips"
                    target="_blank"
                    c="white"
                    style={{ display: 'flex', alignItems: 'center', gap: rem(4), textDecoration: 'none', opacity: 0.8 }}
                >
                    <IconUser size={12} />
                    <Text size="10px" fw={600} tt="uppercase">Author</Text>
                </Anchor>

                <Anchor
                    href="https://github.com/fastfingertips/mist/issues"
                    target="_blank"
                    c="white"
                    style={{ display: 'flex', alignItems: 'center', gap: rem(4), textDecoration: 'none', opacity: 0.8 }}
                >
                    <IconBug size={12} />
                    <Text size="10px" fw={600} tt="uppercase">Issues</Text>
                </Anchor>

                <Anchor
                    href="https://github.com/fastfingertips/mist"
                    target="_blank"
                    c="white"
                    style={{ display: 'flex', alignItems: 'center', gap: rem(4), textDecoration: 'none', opacity: 0.8 }}
                >
                    <IconBrandGithub size={12} />
                    <Text size="10px" fw={600} tt="uppercase">GitHub</Text>
                </Anchor>
            </Group>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </Group>
    );
}
