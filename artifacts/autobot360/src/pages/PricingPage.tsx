import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/month',
    features: ['5 products', '100 scheduled posts/month', 'AI auto-replies (basic)', 'Razorpay integration', 'Email notifications'],
  },
  {
    name: 'Pro',
    price: '₹2,999',
    period: '/month',
    popular: true,
    features: ['50 products', 'Unlimited scheduled posts', 'AI auto-replies (advanced)', 'All payment gateways', 'WhatsApp notifications', 'n8n automation', 'Analytics & insights'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Unlimited products', 'Unlimited posts', 'Dedicated AI model', 'Custom integrations', 'Priority support', 'White-labeling'],
  },
];

export default function PricingPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">AutoBot360</Link>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </div>
        </div>
      </nav>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl font-bold">Simple, transparent pricing</h1>
          <p className="mt-4 text-muted-foreground">Choose the plan that grows with your business</p>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-8 ${plan.popular ? 'ring-2 ring-violet-500/50' : ''}`}
              >
                {plan.popular && (
                  <span className="mb-4 inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs font-medium text-violet-300">
                    Most Popular
                  </span>
                )}
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="mt-2 text-3xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-medium transition ${plan.popular ? 'bg-violet-600 text-white hover:bg-violet-500' : 'border border-white/20 hover:bg-white/5'}`}>
                  Get started
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
