'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';

export default function CheckoutPage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });

  async function handlePay() {
    setLoading(true);
    try {
      await apiClient.simulatePayment(sessionId);
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
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-400" />
          <h1 className="mt-4 text-2xl font-bold">Order Confirmed!</h1>
          <p className="mt-2 text-muted-foreground">Payment successful. The seller has been notified.</p>
          <Button className="mt-6" onClick={() => router.push('/')}>Back to home</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="text-muted-foreground">Complete your purchase</p>

        <div className="glass-card mt-6 space-y-4 p-6">
          <div><Label>Name</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="mt-1" /></div>
          <div><Label>Email</Label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="mt-1" /></div>
          <div><Label>Phone</Label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="mt-1" /></div>

          <div className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground">
            Dev mode: Simulated Razorpay UPI payment
          </div>

          <Button className="w-full" size="lg" loading={loading} onClick={handlePay}>
            Pay with Razorpay (Simulated)
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
