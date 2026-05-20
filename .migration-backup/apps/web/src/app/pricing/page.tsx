'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const plans = [
  { name: 'Free', price: '₹0', features: ['10 products', '20 scheduled posts/mo', '2 social accounts', '100 AI replies/mo'] },
  { name: 'Starter', price: '₹999', features: ['50 products', '100 posts/mo', '4 accounts', '500 AI replies'] },
  { name: 'Pro', price: '₹2,999', features: ['Unlimited products', '500 posts/mo', '10 accounts', '5000 AI replies', 'Team (5)'] },
  { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Dedicated n8n', 'SLA', 'SSO'] },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl text-center"
      >
        <h1 className="text-4xl font-bold">Simple, transparent pricing</h1>
        <p className="mt-4 text-muted-foreground">Start free. Scale as you grow.</p>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card p-6 text-left ${plan.name === 'Pro' ? 'ring-2 ring-violet-500' : ''}`}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                {plan.price}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block rounded-xl border border-white/20 py-2 text-center text-sm font-medium hover:bg-white/5"
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
