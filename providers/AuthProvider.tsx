"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  extractSessionFromUrlHash,
  fetchSupabaseUser,
  getSupabaseEnv,
  loadSession,
  saveSession,
  sendMagicLink,
  type SupabaseSession,
  type SupabaseUser,
} from "@/lib/supabase";

type AuthContextValue = {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  isReady: boolean;
  isEnabled: boolean;
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const isEnabled = !!getSupabaseEnv();
  const [isReady, setIsReady] = useState(!isEnabled);

  useEffect(() => {
    if (!isEnabled) return;

    async function bootstrapAuth() {
      const sessionFromUrl = extractSessionFromUrlHash();
      const storedSession = sessionFromUrl ?? loadSession();

      if (!storedSession?.access_token) {
        setIsReady(true);
        return;
      }

      saveSession(storedSession);
      setSession(storedSession);

      const currentUser = await fetchSupabaseUser(storedSession.access_token);
      setUser(currentUser);
      setIsReady(true);
    }

    void bootstrapAuth();
  }, [isEnabled]);

  const signInWithOtp = useCallback(async (email: string) => {
    return sendMagicLink(email);
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    setUser(null);
    saveSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isReady,
      isEnabled,
      signInWithOtp,
      signOut,
    }),
    [isEnabled, isReady, session, signInWithOtp, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
}
