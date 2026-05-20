import { useState } from 'react';
import { Link } from 'wouter';
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
    if (!form.storeName.trim()) { setError('Store name is required'); return false; }
    if (!form.email.trim()) { setError('Email is required'); return false; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      await signup({ email: form.email.trim(), password: form.password, displayName: form.displayName.trim() || undefined, storeName: form.storeName.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    if (!form.storeName.trim()) { setError('Enter your store name before signing up with Google'); return; }
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold gradient-text">AutoBot360</Link>
          <p className="mt-2 text-muted-foreground">Create your store</p>
          <p className="mt-1 text-xs text-muted-foreground">Mode: {authMode === 'firebase' ? 'Firebase Auth' : 'Dev Auth'}</p>
        </div>

        <div className="glass-card space-y-4 p-8">
          {firebaseEnabled && <GoogleOAuthSetupHelp context="login" />}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
          )}

          <div>
            <Label htmlFor="storeName">Store name *</Label>
            <Input id="storeName" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="My Awesome Store" className="mt-1" required />
          </div>

          {firebaseEnabled && (
            <>
              <Button type="button" variant="secondary" className="w-full" loading={loading} onClick={handleGoogle}>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign up with Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-muted-foreground">or email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Jane Doe" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="mt-1" />
            </div>
            <Button type="submit" className="w-full" loading={loading}>Create account</Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
