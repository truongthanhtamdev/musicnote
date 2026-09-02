import { CLASS_STATUS_LABELS, type ClassStatus } from "@/lib/types";
import { StatusChip, type ChipTone } from "@/components/ui";

const TONES: Record<ClassStatus, ChipTone> = {
  active: "mint",
  paused: "amber",
  ended: "neutral",
};

export default function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return <StatusChip tone={TONES[status] ?? "neutral"}>{CLASS_STATUS_LABELS[status]}</StatusChip>;
}
