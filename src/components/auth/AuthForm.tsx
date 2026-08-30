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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password || (!isLogin && !name.trim())) {
      setError(strings.auth.errRequired);
      return;
    }
    // The backend enforces 8-128; check here so the round trip is not wasted.
    if (!isLogin && password.length < 8) {
      setError(strings.auth.errPasswordLength);
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) {
        await login({ email: email.trim(), password });
      } else {
        await register({ email: email.trim(), password, name: name.trim() });
      }
      router.replace("/claims");
    } catch (err) {
      // 401 is deliberately identical for a wrong password and an unknown
      // email, so the server's own message is the most honest thing to show.
      setError(err instanceof ApiError ? err.message : strings.errors.generic);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h2 className="text-h3">
        {isLogin ? strings.auth.loginTitle : strings.auth.registerTitle}
      </h2>

      <Field
        label={strings.auth.email}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
      />

      {!isLogin && (
        <Field
          label={strings.auth.name}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}

      <Field
        label={strings.auth.password}
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={isLogin ? undefined : strings.auth.passwordHint}
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
