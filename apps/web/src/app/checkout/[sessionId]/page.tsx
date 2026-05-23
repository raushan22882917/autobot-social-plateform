'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, type CheckoutSession } from '@/lib/api';

export default function CheckoutPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (!sessionId) return;
    setSessionLoading(true);
    apiClient
      .getCheckoutSession(sessionId)
      .then((s) => {
        setSession(s);
        const c = s.customer;
        if (c?.name || c?.email || c?.phone) {
          setCustomer({
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
          });
        }
      })
      .catch((err) => {
        alert(err instanceof Error ? err.message : 'Checkout session not found');
      })
      .finally(() => setSessionLoading(false));
  }, [sessionId]);

  async function handlePay() {
    if (!customer.name.trim()) {
      alert('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      await apiClient.updateCheckoutSession(sessionId, {
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
        },
      });
      await apiClient.simulatePayment(sessionId, session?.tenantId);
      setDone(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card max-w-md p-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-brand-whatsapp" />
          <h1 className="mt-4 text-2xl font-bold">Order Confirmed!</h1>
          <p className="mt-2 text-muted-foreground">Payment successful. The seller has been notified.</p>
          <Button className="mt-6" onClick={() => router.push('/')}>Back to home</Button>
        </motion.div>
      </div>
    );
  }

  const line = session?.items?.[0];

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="text-muted-foreground">Complete your purchase</p>

        {sessionLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading checkout…</p>
        ) : (
          <div className="glass-card mt-6 space-y-4 p-6">
            {line && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <p className="font-medium">{line.title || 'Product'}</p>
                <p className="mt-1 text-muted-foreground">
                  Qty {line.quantity ?? 1}
                  {session?.total != null && (
                    <span className="float-right font-semibold text-foreground">
                      ₹{session.total.toLocaleString('en-IN')}
                    </span>
                  )}
                </p>
              </div>
            )}

            <div><Label>Name</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="mt-1" /></div>
            <div><Label>Email</Label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="mt-1" /></div>

            <div className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground">
              Dev mode: Simulated Razorpay UPI payment
            </div>

            <Button className="w-full" size="lg" loading={loading} disabled={sessionLoading} onClick={handlePay}>
              Pay with Razorpay (Simulated)
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
