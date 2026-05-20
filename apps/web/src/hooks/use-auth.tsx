'use client';


import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { apiClient, User, AuthResponse } from '@/lib/api';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { getDefaultRoute, normalizeRole } from '@/lib/roles';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  authMode: 'firebase' | 'dev';
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; displayName?: string; storeName: string }) => Promise<void>;
  loginWithGoogle: (extras?: { displayName?: string; storeName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'autobot360_token';
const USER_KEY = 'autobot360_user';
const SIGNUP_EXTRAS_KEY = 'autobot360_signup_extras';

function normalizeUser(user: User): User {
  return {
    ...user,
    role: normalizeRole(user.role),
    storeName: user.storeName || 'My Store',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'firebase' | 'dev'>(() =>
    isFirebaseConfigured() ? 'firebase' : 'dev'
  );

  useEffect(() => {
    apiClient
      .getAuthConfig()
      .then((cfg) => {
        if (cfg.mode === 'firebase' || cfg.mode === 'firebase-dev') {
          if (isFirebaseConfigured()) setAuthMode('firebase');
        } else if (cfg.devStore) {
          setAuthMode('dev');
        }
      })
      .catch(() => {});
  }, []);
  const router = useRouter();

  const persist = useCallback((res: AuthResponse) => {
    const normalized = normalizeUser(res.user);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    setToken(res.token);
    setUser(normalized);
    return normalized;
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;
    const { user: fresh, token: freshToken } = await apiClient.me(storedToken);
    const normalized = normalizeUser(fresh);
    const tokenToUse = freshToken || storedToken;
    localStorage.setItem(TOKEN_KEY, tokenToUse);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    setUser(normalized);
    setToken(tokenToUse);
  }, []);

  const exchangeFirebaseToken = useCallback(
    async (firebaseUser: FirebaseUser, extras?: { displayName?: string; storeName?: string }) => {
      const idToken = await firebaseUser.getIdToken();
      const res = await apiClient.loginWithFirebase({
        idToken,
        displayName: extras?.displayName || firebaseUser.displayName || undefined,
        storeName: extras?.storeName,
      });
      persist(res);
      return res;
    },
    [persist]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(normalizeUser(JSON.parse(storedUser)));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
      refreshUser().catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      });
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const hasApiToken = localStorage.getItem(TOKEN_KEY);

      if (hasApiToken) {
        setLoading(false);
        return;
      }

      const pendingRaw = sessionStorage.getItem(SIGNUP_EXTRAS_KEY);
      if (pendingRaw) {
        try {
          const extras = JSON.parse(pendingRaw) as { displayName?: string; storeName?: string };
          sessionStorage.removeItem(SIGNUP_EXTRAS_KEY);
          await exchangeFirebaseToken(firebaseUser, extras);
        } catch {
          /* signup/login handler will surface errors */
        }
      }

      setLoading(false);
    });

    return () => unsub();
  }, [exchangeFirebaseToken, refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = getFirebaseAuth();
      let role: string = 'owner';
      if (auth && authMode === 'firebase') {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const res = await exchangeFirebaseToken(cred.user);
        role = res.user.role;
      } else {
        const res = await apiClient.login({ email, password });
        persist(res);
        role = res.user.role;
      }
      router.push(getDefaultRoute(role));
    },
    [authMode, exchangeFirebaseToken, persist, router]
  );

  const signup = useCallback(
    async (data: { email: string; password: string; displayName?: string; storeName: string }) => {
      if (!data.storeName?.trim()) {
        throw new Error('Store name is required');
      }

      const extras = {
        displayName: data.displayName?.trim(),
        storeName: data.storeName.trim(),
      };

      const auth = getFirebaseAuth();
      let role = 'owner';
      if (auth && authMode === 'firebase') {
        sessionStorage.setItem(SIGNUP_EXTRAS_KEY, JSON.stringify(extras));
        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        sessionStorage.removeItem(SIGNUP_EXTRAS_KEY);
        const res = await exchangeFirebaseToken(cred.user, extras);
        role = res.user.role;
      } else {
        const res = await apiClient.signup({
          email: data.email,
          password: data.password,
          displayName: extras.displayName,
          storeName: extras.storeName,
        });
        persist(res);
        role = res.user.role;
      }
      router.push(getDefaultRoute(role));
    },
    [authMode, exchangeFirebaseToken, persist, router]
  );

  const loginWithGoogle = useCallback(
    async (extras?: { displayName?: string; storeName?: string }) => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase is not configured');

      if (extras?.storeName) {
        sessionStorage.setItem(SIGNUP_EXTRAS_KEY, JSON.stringify(extras));
      }

      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      sessionStorage.removeItem(SIGNUP_EXTRAS_KEY);

      const res = await exchangeFirebaseToken(cred.user, {
        displayName: extras?.displayName || cred.user.displayName || undefined,
        storeName: extras?.storeName,
      });
      router.push(getDefaultRoute(res.user.role));
    },
    [exchangeFirebaseToken, router]
  );

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth).catch(() => {});
    sessionStorage.removeItem(SIGNUP_EXTRAS_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, authMode, login, signup, loginWithGoogle, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
