'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, ArrowRight, Eye, EyeOff, CheckCircle2, Store } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { isFirebaseConfigured } from '@/lib/firebase';
import { GoogleOAuthSetupHelp } from '@/components/google-oauth-setup-help';
import { FirebaseSetupBanner } from '@/components/firebase-setup-banner';

const perks = [
  'AI-powered post scheduling',
  'Auto-reply to comments & DMs',
  'Razorpay social checkout',
  'WhatsApp order notifications',
  'Analytics & AI insights',
  'Automated post scheduling',
];

export default function SignupPage() {
  const { signup, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', storeName: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const firebaseEnabled = isFirebaseConfigured();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    if (!form.storeName.trim()) { setError('Store name is required'); return false; }
    if (!form.email.trim())     { setError('Email is required');       return false; }
    if (form.password.length < 6){ setError('Password must be 6+ characters'); return false; }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await signup({
        email: form.email.trim(), password: form.password,
        displayName: form.displayName.trim() || undefined,
        storeName: form.storeName.trim(),
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Signup failed'); }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError('');
    if (!form.storeName.trim()) { setError('Enter your store name first'); return; }
    setLoading(true);
    try { await loginWithGoogle(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Google sign-in failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-[42%] flex-col overflow-hidden lg:flex">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&h=1200&fit=crop"
            alt="Social selling"
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#833AB4]/90 via-[#E4405F]/85 to-[#1877F2]/80" />
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
              Start selling smarter<br />today. For free.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Everything you need to automate your social commerce. No credit card required.
            </p>

            <div className="mt-8 space-y-3">
              {perks.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-whatsapp" />
                  <span className="text-sm text-muted-foreground">{p}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-white/30 bg-white/15 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-brand-instagram">14-day free trial</p>
              <p className="mt-1 text-xs text-muted-foreground">Full access to all Pro features. No credit card needed. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">

          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#F77737]">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AutoBot360</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground">Create your store</h1>
            <p className="mt-2 text-muted-foreground">Start your 14-day free trial. No credit card required.</p>
            {firebaseEnabled && (
              <span className="badge badge-instagram mt-3 inline-flex">Firebase auth</span>
            )}
          </div>

          <FirebaseSetupBanner />
          {firebaseEnabled && <GoogleOAuthSetupHelp context="login" />}

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Store name first */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-semibold text-foreground/80">
              Store name <span className="text-brand-instagram">*</span>
            </label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text" value={form.storeName} onChange={set('storeName')}
                placeholder="My Awesome Store" required
                className="field-input pl-11"
              />
            </div>
          </div>

          {firebaseEnabled && (
            <>
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
                Sign up with Google
              </button>
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs text-muted-foreground uppercase tracking-wider">or with email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground/80">Display name</label>
              <input
                type="text" value={form.displayName} onChange={set('displayName')}
                placeholder="Jane Doe"
                className="field-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground/80">
                Email address <span className="text-brand-instagram">*</span>
              </label>
              <input
                type="email" value={form.email} onChange={set('email')}
                placeholder="you@example.com" required
                className="field-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground/80">
                Password <span className="text-brand-instagram">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  placeholder="Minimum 6 characters" required minLength={6}
                  className="field-input pr-12"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2 w-full py-3.5 text-base disabled:opacity-60">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg> Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">Create account <ArrowRight className="h-4 w-4" /></span>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              By signing up you agree to our{' '}
              <a href="#" className="text-brand-instagram hover:underline">Terms</a> and{' '}
              <a href="#" className="text-brand-instagram hover:underline">Privacy Policy</a>.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-instagram hover:text-brand-instagram transition">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
