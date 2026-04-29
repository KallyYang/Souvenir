"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error || "登录失败";
      const extra = data.debug
        ? `\n\n[debug]\n${JSON.stringify(data.debug, null, 2)}${
            data.detail ? `\n\n[detail]\n${data.detail}` : ""
          }`
        : "";
      setError(msg + extra);
      return;
    }

    startTransition(() => {
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          密码
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base tracking-[0.25em] shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100 dark:focus:ring-neutral-100/10"
          required
          autoFocus
        />
      </div>

      {error && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </pre>
      )}

      <button
        type="submit"
        disabled={isPending || !password}
        className="flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        {isPending ? "登录中…" : "进入"}
      </button>
    </form>
  );
}
