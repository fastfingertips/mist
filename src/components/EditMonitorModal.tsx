import { Modal } from "@mantine/core";
import { MonitorStatus } from "../types";
import { MonitorForm } from "./MonitorForm";

interface EditMonitorModalProps {
    opened: boolean;
    onClose: () => void;
    monitor: MonitorStatus | null;
    onSave: (id: string, name: string, path: string, threshold: number, maxDepth: number | undefined, enabled: boolean) => void;
}

export function EditMonitorModal({ opened, onClose, monitor, onSave }: Readonly<EditMonitorModalProps>) {
    return (
        <Modal opened={opened} onClose={onClose} title="Edit Monitor" centered>
            <MonitorForm
                initialValues={monitor ? {
                    name: monitor.name,
                    path: monitor.path,
                    threshold: monitor.threshold,
                    maxDepth: monitor.maxDepth,
                    enabled: monitor.enabled
                } : undefined}
                submitLabel="Save Changes"
                showExtendedFields
                onSubmit={(values) => {
                    if (monitor) {
                        onSave(monitor.id, values.name, values.path, values.threshold, values.maxDepth, values.enabled);
                    }
                    onClose();
                }}
            />
        </Modal>
    );
}
