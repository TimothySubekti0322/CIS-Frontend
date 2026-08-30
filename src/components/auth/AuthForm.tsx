"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError(strings.auth.errRequired);
      return;
    }
    setSubmitting(true);
    try {
      const creds = { username: username.trim(), password };
      if (isLogin) await login(creds);
      else await register(creds);
      router.replace("/claims");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : strings.errors.generic,
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h2 className="text-h3">
        {isLogin ? strings.auth.loginTitle : strings.auth.registerTitle}
      </h2>

      <Field
        label={strings.auth.username}
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
      />
      <Field
        label={strings.auth.password}
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" loading={submitting}>
        {submitting
          ? isLogin
            ? strings.auth.signingIn
            : strings.auth.registering
          : isLogin
            ? strings.auth.signIn
            : strings.auth.register}
      </Button>

      <p className="text-center text-sm text-regal-navy/70">
        {isLogin ? strings.auth.noAccount : strings.auth.haveAccount}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-bold text-sea-green hover:underline"
        >
          {isLogin ? strings.auth.register : strings.auth.signIn}
        </Link>
      </p>
    </form>
  );
}
