"use client";

import { useTransition } from "react";
import { runBackupAction } from "@/actions/backup";
import { IconPackage } from "@/components/icons";
import { btn } from "@/components/ui";

export default function RunBackupButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => runBackupAction())}
      className={btn.secondary}
    >
      <IconPackage className="w-4 h-4" />
      {isPending ? "Đang sao lưu..." : "Sao lưu ngay lên máy chủ"}
    </button>
  );
}
