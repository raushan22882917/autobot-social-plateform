'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, ArrowRight, Eye, EyeOff, Sparkles, Shield, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { isFirebaseConfigured } from '@/lib/firebase';
import { FirebaseSetupBanner } from '@/components/firebase-setup-banner';

const highlights = [
  { icon: TrendingUp, text: 'Boost sales by 3x with AI automation' },
  { icon: Sparkles,   text: 'Gemini-powered comment replies 24/7' },
  { icon: Users,      text: 'Join 12,000+ sellers across India' },
  { icon: Shield,     text: 'Bank-grade security with Firebase Auth' },
];

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const firebaseEnabled = isFirebaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try { await loginWithGoogle(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Google sign-in failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-[45%] flex-col overflow-hidden lg:flex">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=900&h=1200&fit=crop"
            alt="Social commerce"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#833AB4]/90 via-[#E4405F]/85 to-[#F77737]/80" />
        </div>

        <div className="relative flex flex-1 flex-col p-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#F77737] shadow-lg shadow-brand-instagram/30">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AutoBot360</span>
          </Link>

          <div className="mt-auto pb-10">
            <h2 className="text-4xl font-black leading-tight text-white">
              The smartest way<br />to sell on social.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Automate your entire social commerce pipeline with AI-powered tools built for Indian sellers.
            </p>

            <div className="mt-10 space-y-4">
              {highlights.map((h) => (
                <div key={h.text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-instagram/15 border border-brand-instagram/25">
                    <h.icon className="h-4 w-4 text-brand-instagram" />
                  </div>
                  <span className="text-sm text-muted-foreground">{h.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[['12K+','Sellers'],['₹48Cr+','Revenue'],['2.4M+','Posts']].map(([v,l]) => (
                <div key={l} className="rounded-2xl border border-white/30 bg-white/15 p-4 text-center backdrop-blur-sm">
                  <div className="text-2xl font-black gradient-text">{v}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#F77737]">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AutoBot360</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground">Welcome back</h1>
            <p className="mt-2 text-muted-foreground">Sign in to your AutoBot360 dashboard</p>
            {firebaseEnabled && (
              <span className="badge badge-instagram mt-3 inline-flex">Firebase auth</span>
            )}
          </div>

          <FirebaseSetupBanner />

          {firebaseEnabled && (
            <button
              type="button" onClick={handleGoogle} disabled={loading}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/[0.05] py-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.09] hover:border-white/25 hover:text-foreground disabled:opacity-50"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          )}

          {firebaseEnabled && (
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs text-muted-foreground uppercase tracking-wider">or continue with email</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground/80">Email address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="field-input"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground/80">Password</label>
                <a href="#" className="text-xs text-brand-instagram hover:text-brand-instagram transition">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Enter your password"
                  className="field-input pr-12"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-primary mt-2 w-full py-3.5 text-base disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="font-semibold text-brand-instagram hover:text-brand-instagram transition">Create one free</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
