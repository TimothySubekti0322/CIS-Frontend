"use client";

import type { ReactNode } from "react";
import { strings } from "@/lib/constants/strings";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use the danger styling for destructive confirmations. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Lightweight confirm dialog — one affirmative action + cancel. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = strings.common.confirm,
  cancelLabel = strings.common.cancel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body && <p className="text-sm text-regal-navy/80">{body}</p>}
    </Modal>
  );
}
