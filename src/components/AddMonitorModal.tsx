import { Modal } from "@mantine/core";
import { MonitorForm } from "./MonitorForm";

interface AddMonitorModalProps {
    opened: boolean;
    onClose: () => void;
    onAdd: (name: string, path: string, threshold: number) => void;
}

export function AddMonitorModal({ opened, onClose, onAdd }: Readonly<AddMonitorModalProps>) {
    return (
        <Modal opened={opened} onClose={onClose} title="Add New Monitor" centered>
            <MonitorForm
                submitLabel="Add Monitor"
                onSubmit={(values) => {
                    onAdd(values.name, values.path, values.threshold);
                    onClose();
                }}
            />
        </Modal>
    );
}
