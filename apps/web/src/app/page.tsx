'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Zap, Share2, ShoppingCart, BarChart3, MessageCircle } from 'lucide-react';

const features = [
  { icon: Share2, title: 'Multi-Platform Publishing', desc: 'Schedule to Instagram, Facebook, YouTube & TikTok' },
  { icon: Bot, title: 'AI Auto-Replies', desc: 'Gemini-powered comment monitoring & sales responses' },
  { icon: ShoppingCart, title: 'Social Checkout', desc: 'Razorpay payments directly from social posts' },
  { icon: MessageCircle, title: 'WhatsApp Alerts', desc: 'Instant seller notifications on every order' },
  { icon: BarChart3, title: 'Analytics & Insights', desc: 'AI-generated weekly performance digests' },
  { icon: Zap, title: 'n8n Automation', desc: 'Enterprise workflow orchestration at scale' },
];

export default function LandingPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
    >
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"
        >
          <span className="text-xl font-bold gradient-text">AutoBot360</span>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="flex items-center gap-4"
          >
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
            <Link href="/signup" className="btn-primary">Start Free</Link>
          </motion.div>
        </motion.div>
      </nav>

      <section className="relative px-6 pt-32 pb-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-bold tracking-tight md:text-7xl"
          >
            Sell on Social.
            <br />
            <span className="gradient-text">Powered by AI.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Connect accounts, publish products, auto-reply to comments, capture leads,
            process payments — all from one AI-powered dashboard.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex justify-center gap-4"
          >
            <Link href="/signup" className="btn-primary text-base px-8 py-3">Get Started Free</Link>
            <Link href="/pricing" className="rounded-xl border border-white/20 px-8 py-3 text-sm font-semibold hover:bg-white/5">
              View Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <f.icon className="h-8 w-8 text-violet-400" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
