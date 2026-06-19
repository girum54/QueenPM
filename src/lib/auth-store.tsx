import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, type AuthUser } from "./api/auth.api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    name: string;
    username?: string;
    color?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to restore session on first mount
  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    authApi
      .getSession()
      .then((data) => {
        if (data && "user" in data) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const data = await authApi.signIn({ email, password });
    setUser(data.user);
  }, []);

  const signUp = useCallback(
    async (payload: {
      email: string;
      password: string;
      name: string;
      username?: string;
      color?: string;
    }) => {
      setError(null);
      const data = await authApi.signUp(payload);
      setUser(data.user);
    },
    []
  );

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signIn, signUp, signOut, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
