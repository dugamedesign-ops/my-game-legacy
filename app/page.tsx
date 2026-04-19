"use client";

import Image from "next/image";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { CollectionDashboard } from "@/components/collection/CollectionDashboard";
import { mockItems } from "@/lib/mock-data";
import { useAuth } from "@/providers/AuthProvider";

export default function HomePage() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_25%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.12),_transparent_20%),linear-gradient(180deg,_#09090b_0%,_#111827_100%)] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-5 text-white/75 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
            Carregando My Game Legacy...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_25%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.12),_transparent_20%),linear-gradient(180deg,_#09090b_0%,_#111827_100%)] px-4 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center py-10">
          <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
              <div className="relative flex h-[120px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0d1730] to-[#0b1220]">
                <Image
                  src="/my-game-legacy-official.png"
                  alt="Logo oficial My Game Legacy"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 420px"
                  priority
                />
              </div>
            </div>
            <p className="mt-4 text-center text-xs uppercase tracking-[0.25em] text-white/45">
              Meu legado começa aqui
            </p>
            <h1 className="mt-2 text-center text-2xl font-semibold text-white">
              Entrar no My Game Legacy
            </h1>
            <p className="mt-2 text-center text-sm text-white/60">
              Faça login para acessar sua coleção, pendências e histórico financeiro.
            </p>
            <div className="mt-4">
              <AuthPanel />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <CollectionDashboard items={mockItems} />;
}
