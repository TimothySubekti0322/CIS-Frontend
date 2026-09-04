import type { PolicyStatus } from "@/types/policy";
import { strings } from "@/lib/constants/strings";
import { StatusPill } from "@/components/ui/StatusPill";

export function PolicyStatusPill({ status }: { status: PolicyStatus }) {
  return status === "rolled_out" ? (
    <StatusPill tone="success">{strings.policies.rolledOut}</StatusPill>
  ) : (
    <StatusPill tone="neutral">{strings.policies.notRolledOut}</StatusPill>
  );
}
