"use client";

import { Monitor } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/assets";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] bg-brand-800 flex-col justify-between p-10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-300 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-brand-900" />
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">AssetCore</span>
          </div>
          <p className="text-brand-300/60 text-sm max-w-xs leading-relaxed">
            Enterprise IT Asset Management. Track, manage, and optimize your hardware assets across every location.
          </p>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {["20,000+", "10", "50+"].map((val, i) => (
              <div key={i} className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-3">
                <p className="text-lg font-bold text-brand-300">{val}</p>
                <p className="text-[11px] text-brand-300/50 mt-0.5">{["Assets tracked", "Countries", "Technicians"][i]}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-brand-300/30">ITIL-compliant asset lifecycle management</p>
        </div>

        {/* Decorative gradient */}
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-brand-300/10 blur-3xl" />
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-brand-300/5 blur-3xl" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand-800 flex items-center justify-center">
              <Monitor className="w-4.5 h-4.5 text-brand-300" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">AssetCore</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[13px] font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300/30 transition-all"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300/30 transition-all"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-800 text-white font-medium py-2.5 text-sm hover:bg-brand-900 disabled:opacity-50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-300/40 focus:ring-offset-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
