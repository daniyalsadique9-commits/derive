"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { FieldLabel, inputStyles } from "@/components/ui/form-controls";

/** Asks for the admin username and password before the admin panel opens. */
export function AdminSignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    }).catch(() => null);

    if (response?.ok) {
      router.refresh();
      return;
    }
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Could not sign in. Please try again.");
    setPending(false);
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto w-full max-w-sm space-y-5 rounded-2xl border border-line bg-surface p-6"
    >
      <div>
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink">
          <Lock className="size-4 text-accent" />
          Admin sign-in
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Enter the admin username and password to open the panel.
        </p>
      </div>
      <label className="block">
        <FieldLabel>Username</FieldLabel>
        <input name="username" autoComplete="username" required className={inputStyles} />
      </label>
      <label className="block">
        <FieldLabel>Password</FieldLabel>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputStyles}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonStyles({ className: "w-full" })}>
        {pending ? "Checking…" : "Open admin panel"}
      </button>
    </form>
  );
}
