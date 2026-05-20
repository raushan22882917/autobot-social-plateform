import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';

export default function PublicProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const productId = new URLSearchParams(window.location.search).get('id');

  async function handleBuy() {
    if (!productId) {
      alert('Product ID missing. Use link from dashboard.');
      return;
    }
    setLoading(true);
    try {
      const session = await apiClient.createCheckout({ productId, quantity: 1 });
      setLocation(`/checkout/${session.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-white/10 px-6 py-4">
        <span className="text-lg font-bold gradient-text">AutoBot360</span>
      </nav>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl px-6 py-12">
        <div className="glass-card overflow-hidden">
          <div className="flex h-64 items-center justify-center bg-gradient-to-br from-violet-500/30 to-cyan-500/30">
            <ShoppingBag className="h-20 w-20 text-violet-400/60" />
          </div>
          <div className="p-8">
            <h1 className="text-3xl font-bold capitalize">{slug?.replace(/-/g, ' ')}</h1>
            <p className="mt-4 text-muted-foreground">Premium product from AutoBot360 store</p>
            <Button className="mt-8 w-full" size="lg" loading={loading} onClick={handleBuy}>
              Buy Now
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
