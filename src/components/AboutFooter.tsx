import { Group, Anchor, Text } from "@mantine/core";
import { IconBrandGithub, IconBug, IconUser } from "@tabler/icons-react";
import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useState } from 'react';

export function AboutFooter() {
    const [version, setVersion] = useState('');

    useEffect(() => {
        getVersion().then(setVersion).catch(console.error);
    }, []);

    return (
        <Group justify="center" gap="lg" h="100%" style={{ flexShrink: 0 }}>
            <Group gap={4}>
                <IconBrandGithub size={14} style={{ opacity: 0.5 }} />
                <Anchor href="https://github.com/fastfingertips/mist" target="_blank" size="xs" className="footer-link">
                    GitHub
                </Anchor>
            </Group>
            <Group gap={4}>
                <IconBug size={14} style={{ opacity: 0.5 }} />
                <Anchor href="https://github.com/fastfingertips/mist/issues" target="_blank" size="xs" className="footer-link">
                    Issues
                </Anchor>
            </Group>
            <Group gap={4}>
                <IconUser size={14} style={{ opacity: 0.5 }} />
                <Anchor href="https://github.com/fastfingertips" target="_blank" size="xs" className="footer-link">
                    FastFingertips
                </Anchor>
            </Group>
            {version && <Text size="xs" c="dimmed" style={{ opacity: 0.5 }}>v{version}</Text>}
        </Group>
    );
}
