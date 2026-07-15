import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Crown, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { ChessQueen } from "@/components/ChessQueen";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Queen PM" },
      { name: "description", content: "Sign in or create your Queen PM account." },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup";

const ACCENT_COLORS = [
  { label: "Sky", value: "bg-sky-500" },
  { label: "Fuchsia", value: "bg-fuchsia-500" },
  { label: "Emerald", value: "bg-emerald-500" },
  { label: "Amber", value: "bg-amber-500" },
  { label: "Rose", value: "bg-rose-500" },
  { label: "Violet", value: "bg-violet-500" },
];

function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");

  // Form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [color, setColor] = useState(ACCENT_COLORS[0].value);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDestination = (u?: any) =>
    u?.role === "stakeholder" ? "/stakeholder" : "/";

  // If already logged in, redirect to appropriate dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: getDestination(user) });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        const handle = username.startsWith("@") ? username : `@${username}`;
        await signUp({ email, password, name, username: handle, color });
      }
      navigate({ to: getDestination(email) });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen chess-pattern-subtle-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <ChessQueen size={64} animated={true} className="text-white" />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">QueenPM</h1>
            <p className="text-sm text-gray-400">Unifying your team</p>
          </div>
          <Loader2 className="size-6 text-white animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen chess-pattern-subtle-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-gray-800 bg-black/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-white grid place-items-center shadow-lg">
                <ChessQueen size={20} className="text-black" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-50 tracking-tight">Queen PM</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Sparkles className="size-3 text-fuchsia-400" />
                  AI-powered project management
                </div>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              <button
                id="tab-signin"
                type="button"
                onClick={() => { setMode("signin"); setError(null); }}
                className={`flex-1 h-8 rounded-md text-sm font-medium transition-all ${
                  mode === "signin"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Sign In
              </button>
              <button
                id="tab-signup"
                type="button"
                onClick={() => { setMode("signup"); setError(null); }}
                className={`flex-1 h-8 rounded-md text-sm font-medium transition-all ${
                  mode === "signup"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="input-name"
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="w-full h-10 rounded-lg bg-slate-800/60 border border-slate-700 px-3.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/20 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                    <input
                      id="input-username"
                      type="text"
                      required
                      value={username.replace(/^@/, "")}
                      onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                      placeholder="ada"
                      className="w-full h-10 rounded-lg bg-slate-800/60 border border-slate-700 pl-8 pr-3.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/20 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Avatar Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => setColor(c.value)}
                        className={`size-7 rounded-full ${c.value} transition-all ${
                          color === c.value
                            ? "ring-2 ring-white/60 ring-offset-2 ring-offset-slate-900 scale-110"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Email
              </label>
              <input
                id="input-email"
                type="email"
                required
                autoFocus={mode === "signin"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 rounded-lg bg-gray-800 border border-gray-700 px-3.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="input-password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 rounded-lg bg-gray-800 border border-gray-700 px-3.5 pr-10 text-sm text-white placeholder:text-gray-600 outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs text-rose-300">
                {error}
              </div>
            )}

            <button
              id="btn-submit"
              type="submit"
              disabled={busy}
              className="w-full h-10 rounded-lg bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-black transition-all flex items-center justify-center gap-2 mt-2"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-center text-xs text-gray-600 pt-1">
              {mode === "signin" ? (
                <>Don't have an account?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-white hover:text-gray-300 transition">
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="text-white hover:text-gray-300 transition">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
