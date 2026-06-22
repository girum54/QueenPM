const API_BASE_URL =
  typeof window !== "undefined"
    ? (import.meta.env.VITE_API_URL || "http://localhost:3001")
    : (process.env.VITE_API_URL || "http://localhost:3001");

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string | null;
  color: string | null;
  isAi: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  name: string;
  username?: string;
  color?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(body.message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  signUp: (payload: SignUpPayload) =>
    authRequest<{ message: string; user: AuthUser }>("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  signIn: (payload: SignInPayload) =>
    authRequest<{ message: string; user: AuthUser; session: AuthSession | null }>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  signOut: () =>
    authRequest<{ message: string }>("/auth/sign-out", {
      method: "POST",
    }),

  getSession: () =>
    authRequest<{ user: AuthUser; session: AuthSession } | null>("/auth/session").catch(() => null),
};
