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
  refreshSession,
  saveSession,
  sendMagicLink,
  signInWithPassword,
  signOutSupabase,
  signUpWithPassword,
  startGoogleSignIn,
  type SupabaseSession,
  type SupabaseUser,
} from "@/lib/supabase";

type AuthContextValue = {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  isReady: boolean;
  isEnabled: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
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

      let activeSession = storedSession;
      let currentUser = await fetchSupabaseUser(activeSession.access_token);

      if (!currentUser && activeSession.refresh_token) {
        const refreshed = await refreshSession(activeSession.refresh_token);
        if (!refreshed.error && refreshed.session) {
          activeSession = refreshed.session;
          currentUser = await fetchSupabaseUser(activeSession.access_token);
        }
      }

      if (!currentUser) {
        saveSession(null);
        setSession(null);
        setUser(null);
        setIsReady(true);
        return;
      }

      saveSession(activeSession);
      setSession(activeSession);
      setUser(currentUser);
      setIsReady(true);
    }

    void bootstrapAuth();
  }, [isEnabled]);

  const signInWithGoogle = useCallback(async () => {
    return startGoogleSignIn();
  }, []);

  const handleLoginSuccess = useCallback(
    async (nextSession: SupabaseSession, userHint?: SupabaseUser | null) => {
      saveSession(nextSession);
      setSession(nextSession);

      const nextUser =
        userHint ?? (await fetchSupabaseUser(nextSession.access_token));

      if (!nextUser) {
        return { error: "Não foi possível carregar o usuário autenticado." };
      }

      setUser(nextUser);
      return {};
    },
    [],
  );

  const signInWithPasswordAction = useCallback(
    async (email: string, password: string) => {
      const result = await signInWithPassword(email, password);
      if (result.error || !result.session) {
        return { error: result.error ?? "Falha ao entrar com email e senha." };
      }

      return handleLoginSuccess(result.session, result.user);
    },
    [handleLoginSuccess],
  );

  const signUpWithPasswordAction = useCallback(
    async (email: string, password: string) => {
      const result = await signUpWithPassword(email, password);

      if (result.error) {
        return { error: result.error };
      }

      if (result.session) {
        const loginResult = await handleLoginSuccess(result.session, result.user);
        if (loginResult.error) return loginResult;
      }

      return { needsEmailConfirmation: result.needsEmailConfirmation };
    },
    [handleLoginSuccess],
  );

  const signInWithOtp = useCallback(async (email: string) => {
    return sendMagicLink(email);
  }, []);

  const signOut = useCallback(async () => {
    const accessToken = session?.access_token;
    setSession(null);
    setUser(null);
    saveSession(null);

    if (accessToken) {
      await signOutSupabase(accessToken);
    }
  }, [session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isReady,
      isEnabled,
      signInWithGoogle,
      signInWithPassword: signInWithPasswordAction,
      signUpWithPassword: signUpWithPasswordAction,
      signInWithOtp,
      signOut,
    }),
    [
      isEnabled,
      isReady,
      session,
      signInWithGoogle,
      signInWithOtp,
      signInWithPasswordAction,
      signOut,
      signUpWithPasswordAction,
      user,
    ],
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
