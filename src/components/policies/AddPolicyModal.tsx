"use client";

import { useState } from "react";
import { strings } from "@/lib/constants/strings";
import { useCreatePolicy } from "@/lib/hooks/usePolicies";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FileDropzone } from "@/components/ui/FileDropzone";

/**
 * "Add Public Policy" modal (PRD US40). Exactly three fields; Confirm is
 * disabled until all three are filled. AI-matchmaking config is never surfaced
 * — it runs automatically after Confirm (PRD §5.3).
 */
export function AddPolicyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [rolledOutDate, setRolledOutDate] = useState("");
  const { mutateAsync, isPending } = useCreatePolicy();
  const { toast } = useToast();

  const canSubmit = Boolean(file && name.trim() && rolledOutDate);

  function reset() {
    setFile(null);
    setName("");
    setRolledOutDate("");
  }

  async function submit() {
    if (!canSubmit || !file) return;
    try {
      await mutateAsync({ name: name.trim(), rolledOutDate, fileName: file.name });
      toast(`“${name.trim()}” added — matchmaking started`);
      reset();
      onClose();
    } catch {
      toast(strings.errors.generic, "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={strings.policies.addPolicyTitle}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={isPending}
          >
            {strings.common.cancel}
          </Button>
          <Button onClick={submit} disabled={!canSubmit} loading={isPending}>
            {strings.common.confirm}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-bold text-regal-navy">
            {strings.policies.file}
          </p>
          <FileDropzone
            file={file}
            onFile={setFile}
            rejectMessage={strings.policies.fileReject}
            hint={strings.policies.fileHint}
          />
        </div>
        <Field
          label={strings.policies.policyName}
          placeholder={strings.policies.policyNamePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label={strings.policies.rolledOutDate}
          type="date"
          value={rolledOutDate}
          onChange={(e) => setRolledOutDate(e.target.value)}
        />
      </div>
    </Modal>
  );
}
