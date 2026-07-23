import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Crown, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Queen PM" },
      { name: "description", content: "Sign in or create your Queen PM account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await signIn(email, password);
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
          <img src="/logo.png" alt="Queen PM Logo" className="size-20 object-contain animate-pulse" />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">QueenPM</h1>
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
              <div className="size-10 grid place-items-center overflow-hidden">
                <img src="/logo.png" alt="Queen PM" className="size-full object-contain drop-shadow-md" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-50 tracking-tight">Queen PM</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Sparkles className="size-3 text-fuchsia-400" />
                  AI-powered project management
                </div>
              </div>
            </div>

          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Email
              </label>
              <input
                id="input-email"
                type="email"
                required
                autoFocus
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
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
