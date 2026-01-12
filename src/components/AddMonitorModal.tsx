import { useState } from "react";
import { Modal, Stack, TextInput, ActionIcon, NumberInput, Button } from "@mantine/core";
import { IconFolder } from "@tabler/icons-react";
import { AppColors } from "../theme";
import { handleFolderBrowse } from "../utils";

interface AddMonitorModalProps {
    opened: boolean;
    onClose: () => void;
    onAdd: (name: string, path: string, threshold: number) => void;
}

export function AddMonitorModal({ opened, onClose, onAdd }: Readonly<AddMonitorModalProps>) {
    const [path, setPath] = useState('');
    const [name, setName] = useState('');
    const [threshold, setThreshold] = useState<string | number>(1024);

    const handleSubmit = () => {
        if (!path) return;
        onAdd(name || "New Monitor", path, Number(threshold));
        // Reset form
        setPath('');
        setName('');
        setThreshold(1024);
        onClose();
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Add New Monitor" centered>
            <Stack>
                <TextInput
                    label="Path"
                    placeholder="Click button to select folder..."
                    value={path}
                    onChange={(e) => setPath(e.currentTarget.value)}
                    rightSection={
                        <ActionIcon variant="light" color={AppColors.primary} onClick={() => handleFolderBrowse(setPath, setName)} title="Browse Folder">
                            <IconFolder size={16} />
                        </ActionIcon>
                    }
                />
                <TextInput
                    label="Name"
                    placeholder="Folder Name (Auto-filled)"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                />
                <NumberInput label="Threshold (MB)" value={threshold} onChange={setThreshold} />
                <Button onClick={handleSubmit} mt="md" color={AppColors.primary}>Add Monitor</Button>
            </Stack>
        </Modal>
    );
}
