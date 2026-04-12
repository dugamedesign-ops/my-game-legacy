"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getMissingSupabaseEnvKeys } from "@/lib/supabase";

type AuthMode = "login" | "signup" | "magic";

export function AuthPanel() {
  const {
    user,
    isEnabled,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    signInWithOtp,
    signOut,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actionLabel = useMemo(() => {
    if (mode === "signup") return "Criar conta";
    if (mode === "magic") return "Enviar link mágico";
    return "Entrar";
  }, [mode]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);

    if (!email.trim()) {
      setStatus("Informe um e-mail válido.");
      return;
    }

    if (mode !== "magic" && password.trim().length < 6) {
      setStatus("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    if (mode === "magic") {
      const result = await signInWithOtp(email.trim());
      setIsSubmitting(false);

      if (result.error) {
        setStatus(`Falha ao enviar link: ${result.error}`);
        return;
      }

      setStatus("Link de acesso enviado. Verifique seu e-mail.");
      return;
    }

    if (mode === "signup") {
      const result = await signUpWithPassword(email.trim(), password);
      setIsSubmitting(false);

      if (result.error) {
        setStatus(`Falha ao criar conta: ${result.error}`);
        return;
      }

      if (result.needsEmailConfirmation) {
        setStatus("Conta criada! Confirme seu e-mail para finalizar o acesso.");
        return;
      }

      setStatus("Conta criada e login realizado com sucesso.");
      return;
    }

    const result = await signInWithPassword(email.trim(), password);
    setIsSubmitting(false);

    if (result.error) {
      setStatus(`Falha ao entrar: ${result.error}`);
      return;
    }

    setStatus("Login realizado com sucesso.");
  }

  async function handleGoogleLogin() {
    setStatus(null);
    setIsSubmitting(true);

    const result = await signInWithGoogle();
    if (result.error) {
      setStatus(`Falha ao abrir login Google: ${result.error}`);
      setIsSubmitting(false);
      return;
    }
  }

  if (!isEnabled) {
    const missingEnvKeys = getMissingSupabaseEnvKeys();

    return (
      <div className="space-y-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs text-amber-100">
        <p className="font-medium">Autenticação online desativada.</p>
        <p>
          Variáveis ausentes:{" "}
          {missingEnvKeys.length > 0
            ? missingEnvKeys.join(", ")
            : "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"}
          .
        </p>
        <ol className="list-decimal space-y-1 pl-4 text-amber-100/90">
          <li>Copie `.env.example` para `.env.local`.</li>
          <li>Confirme URL e anon key do seu projeto Supabase.</li>
          <li>Reinicie o servidor (`npm run dev`).</li>
        </ol>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
        <span>Conectado como {user.email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            mode === "login"
              ? "bg-white text-black"
              : "border border-white/15 text-white/80 hover:bg-white/10"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            mode === "signup"
              ? "bg-white text-black"
              : "border border-white/15 text-white/80 hover:bg-white/10"
          }`}
        >
          Criar conta
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            mode === "magic"
              ? "bg-white text-black"
              : "border border-white/15 text-white/80 hover:bg-white/10"
          }`}
        >
          Link mágico
        </button>
      </div>

      <button
        type="button"
        onClick={() => void handleGoogleLogin()}
        disabled={isSubmitting}
        className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continuar com Google
      </button>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seuemail@dominio.com"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
        />

        {mode !== "magic" && (
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="sua senha"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
          />
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Processando..." : actionLabel}
        </button>
      </form>

      {status && <p className="text-xs text-white/65">{status}</p>}
    </div>
  );
}
