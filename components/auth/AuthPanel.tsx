"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

export function AuthPanel() {
  const { user, isEnabled, signInWithOtp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);

    if (!email.trim()) {
      setStatus("Informe um e-mail para receber o link mágico.");
      return;
    }

    setIsSubmitting(true);
    const result = await signInWithOtp(email.trim());
    setIsSubmitting(false);

    if (result.error) {
      setStatus(`Falha ao enviar link: ${result.error}`);
      return;
    }

    setStatus("Link de acesso enviado. Verifique seu e-mail.");
  }

  if (!isEnabled) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs text-amber-100">
        Autenticação online desativada. Defina NEXT_PUBLIC_SUPABASE_URL e
        NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar login e sincronização.
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
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seuemail@dominio.com"
          className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Enviando..." : "Entrar com link mágico"}
        </button>
      </div>
      {status && <p className="text-xs text-white/65">{status}</p>}
    </form>
  );
}
