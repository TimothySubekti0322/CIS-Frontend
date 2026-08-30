"use client";

import { useState } from "react";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { useCreatePolicy } from "@/lib/hooks/usePolicies";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextArea } from "@/components/ui/TextArea";
import { FileDropzone } from "@/components/ui/FileDropzone";

/**
 * "Add Public Policy". Uploads multipart/form-data — the File itself, not a
 * filename — and Confirm stays disabled until the three required parts are
 * present.
 *
 * `status` is never collected: the backend derives it from the rolled-out
 * date. AI matchmaking configuration is never surfaced either; it starts
 * automatically and the modal closes on the 201, before it finishes.
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
  const [description, setDescription] = useState("");
  const { mutateAsync, isPending } = useCreatePolicy();
  const { toast } = useToast();

  const canSubmit = Boolean(file && name.trim().length >= 2 && rolledOutDate);

  function reset() {
    setFile(null);
    setName("");
    setRolledOutDate("");
    setDescription("");
  }

  function close() {
    reset();
    onClose();
  }

  async function submit() {
    if (!canSubmit || !file) return;
    try {
      await mutateAsync({
        file,
        name: name.trim(),
        rolledOutDate,
        description: description.trim() || undefined,
      });
      toast(`“${name.trim()}” added — matchmaking started`);
      close();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={strings.policies.addPolicyTitle}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isPending}>
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
          maxLength={500}
        />
        <Field
          label={strings.policies.rolledOutDate}
          type="date"
          value={rolledOutDate}
          onChange={(e) => setRolledOutDate(e.target.value)}
        />
        <TextArea
          label={strings.policies.description}
          placeholder={strings.policies.descriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={3}
        />
      </div>
    </Modal>
  );
}
