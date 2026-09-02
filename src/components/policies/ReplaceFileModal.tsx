"use client";

import { useState } from "react";
import type { Policy } from "@/types/policy";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { useReplacePolicyFile } from "@/lib/hooks/usePolicies";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { LargeFileWarning } from "./LargeFileWarning";

/**
 * `PUT /policies/:id/file`. The policy keeps its id, its `aiPolicyId` and every
 * claim correlation — the reason this exists instead of DELETE + re-create,
 * which loses all three.
 *
 * Matchmaking re-runs against the new document, so the modal warns that the
 * "Processing" badge will come back. 409 means a job is already in flight.
 */
export function ReplaceFileModal({
  policy,
  open,
  onClose,
}: {
  policy: Policy;
  open: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const { mutateAsync, isPending } = useReplacePolicyFile(policy.id);
  const { toast } = useToast();

  function close() {
    setFile(null);
    onClose();
  }

  async function submit() {
    if (!file) return;
    try {
      await mutateAsync({ file });
      toast(strings.policies.replaceFileDone);
      close();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={strings.policies.replaceFileTitle}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isPending}>
            {strings.common.cancel}
          </Button>
          <Button onClick={submit} disabled={!file} loading={isPending}>
            {strings.policies.replaceFile}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-regal-navy/70">
          {strings.policies.replaceFileHint}
        </p>
        {policy.fileName && (
          <p className="text-xs text-regal-navy/50">
            Current document: <span className="font-bold">{policy.fileName}</span>
          </p>
        )}
        <FileDropzone
          file={file}
          onFile={setFile}
          rejectMessage={strings.policies.fileReject}
          hint={strings.policies.fileHint}
        />
        <LargeFileWarning file={file} />
      </div>
    </Modal>
  );
}
