import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { strings } from "@/lib/constants/strings";

export const metadata: Metadata = { title: strings.auth.registerTitle };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
