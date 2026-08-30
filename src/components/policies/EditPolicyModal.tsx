"use client";

import { useEffect, useState } from "react";
import type { PolicyDetail, UpdatePolicyPayload } from "@/types/policy";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { useUpdatePolicy } from "@/lib/hooks/usePolicies";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextArea } from "@/components/ui/TextArea";

/** ISO timestamp to the `YYYY-MM-DD` the PATCH endpoint expects. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/**
 * `PATCH /policies/:id`. Every field is optional but at least one must change,
 * so only genuinely edited fields are sent — an unchanged form is not
 * submittable rather than being rejected with a 400.
 *
 * The document itself cannot be replaced: there is no update-file route.
 * See MISSING_ENDPOINT.MD §5.
 */
export function EditPolicyModal({
  policy,
  open,
  onClose,
}: {
  policy: PolicyDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(policy.name);
  const [rolledOutDate, setRolledOutDate] = useState(toDateInput(policy.rolledOutDate));
  const [description, setDescription] = useState(policy.description ?? "");
  const { mutateAsync, isPending } = useUpdatePolicy(policy.id);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setName(policy.name);
    setRolledOutDate(toDateInput(policy.rolledOutDate));
    setDescription(policy.description ?? "");
  }, [open, policy]);

  const patch: UpdatePolicyPayload = {};
  if (name.trim() !== policy.name) patch.name = name.trim();
  if (rolledOutDate !== toDateInput(policy.rolledOutDate)) {
    patch.rolledOutDate = rolledOutDate;
  }
  if (description !== (policy.description ?? "")) patch.description = description;

  const dirty = Object.keys(patch).length > 0;
  const valid = name.trim().length >= 2 && Boolean(rolledOutDate);

  async function submit() {
    if (!dirty || !valid) return;
    try {
      await mutateAsync(patch);
      toast(strings.policies.updated);
      onClose();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={strings.policies.editTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {strings.common.cancel}
          </Button>
          <Button onClick={submit} disabled={!dirty || !valid} loading={isPending}>
            {strings.common.save}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label={strings.policies.policyName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={500}
        />
        <Field
          label={strings.policies.rolledOutDate}
          type="date"
          value={rolledOutDate}
          onChange={(e) => setRolledOutDate(e.target.value)}
          hint="Changing this re-derives the Rolled Out / Not Rolled Out status."
        />
        <TextArea
          label={strings.policies.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={3}
        />
      </div>
    </Modal>
  );
}
