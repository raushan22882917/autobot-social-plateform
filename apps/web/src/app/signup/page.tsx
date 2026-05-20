'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isFirebaseConfigured } from '@/lib/firebase';
import { GoogleOAuthSetupHelp } from '@/components/google-oauth-setup-help';

export default function SignupPage() {
  const { signup, loginWithGoogle, authMode } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', storeName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const firebaseEnabled = isFirebaseConfigured();

  function validateForm() {
    if (!form.storeName.trim()) {
      setError('Store name is required');
      return false;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      await signup({
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName.trim() || undefined,
        storeName: form.storeName.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    if (!form.storeName.trim()) {
      setError('Enter your store name before signing up with Google');
      return;
    }
    setLoading(true);
    try {
      await loginWithGoogle({
        storeName: form.storeName.trim(),
        displayName: form.displayName.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-screen items-center justify-center px-4"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold gradient-text">AutoBot360</Link>
          <p className="mt-2 text-muted-foreground">
            Create your store — you&apos;ll be the <strong>Owner</strong>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mode: {authMode === 'firebase' ? 'Firebase Auth' : 'Dev Auth'}
          </p>
        </div>

        <motion.div layout className="glass-card space-y-4 p-8">
          {firebaseEnabled && <GoogleOAuthSetupHelp context="login" />}
          {firebaseEnabled && (
            <>
              <Button type="button" variant="secondary" className="w-full" loading={loading} onClick={handleGoogle}>
                Sign up with Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 text-muted-foreground">or email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
            )}
            <div>
              <Label>Store Name *</Label>
              <Input
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                placeholder="Jane's Boutique"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Your Name</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Create store account
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            New accounts get the <span className="text-violet-400">owner</span> role. Invite admins from Settings.
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Have an account? <Link href="/login" className="text-violet-400 hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
