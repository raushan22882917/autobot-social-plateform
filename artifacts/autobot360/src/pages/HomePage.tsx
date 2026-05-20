import { Link } from 'wouter';
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

export default function HomePage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold gradient-text">AutoBot360</span>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
            <Link href="/signup" className="btn-primary">Start Free</Link>
          </div>
        </div>
      </nav>

      <section className="relative px-6 pb-20 pt-32">
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
            AutoBot360 automates your social commerce — from AI content creation to comment replies,
            payments, and order management. All in one dashboard.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link href="/signup" className="btn-primary px-8 py-3 text-base">
              Start for free
            </Link>
            <Link href="/login" className="rounded-xl border border-white/20 px-8 py-3 text-base text-muted-foreground transition hover:border-white/40 hover:text-foreground">
              Sign in
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold">Everything you need to sell on social</h2>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                className="glass-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20">
                  <f.icon className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold">Ready to automate your social sales?</h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of sellers who use AutoBot360 to grow their social commerce business.
          </p>
          <Link href="/signup" className="btn-primary mt-8 inline-block px-8 py-3 text-base">
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} AutoBot360. All rights reserved.</p>
      </footer>
    </motion.div>
  );
}
