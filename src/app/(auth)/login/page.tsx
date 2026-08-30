import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { strings } from "@/lib/constants/strings";

export const metadata: Metadata = { title: strings.auth.loginTitle };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
