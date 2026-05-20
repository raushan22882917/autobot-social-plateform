import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  Bot, Zap, Share2, ShoppingCart, BarChart3, MessageCircle,
  ArrowRight, CheckCircle2, Star, TrendingUp, Users, Instagram,
  Youtube, Facebook, Play, Sparkles, Shield, Globe
} from 'lucide-react';

const features = [
  { icon: Bot,           color: 'violet', title: 'AI Auto-Replies',           desc: 'Gemini-powered comment monitoring that converts followers to buyers 24/7.' },
  { icon: Share2,        color: 'cyan',   title: 'Multi-Platform Publishing',  desc: 'Schedule to Instagram, Facebook, YouTube & TikTok from one place.' },
  { icon: ShoppingCart,  color: 'pink',   title: 'Social Checkout',            desc: 'Razorpay payments directly from post comments — zero friction selling.' },
  { icon: BarChart3,     color: 'emerald',title: 'AI Analytics',               desc: 'Weekly AI-generated performance digests with actionable insights.' },
  { icon: MessageCircle, color: 'amber',  title: 'WhatsApp Alerts',            desc: 'Instant seller notifications on every order, lead, and comment.' },
  { icon: Zap,           color: 'violet', title: 'n8n Automation',             desc: 'Enterprise-grade workflow orchestration without writing a single line of code.' },
];

const iconColor: Record<string, string> = {
  violet: 'text-violet-400',
  cyan:   'text-cyan-400',
  pink:   'text-pink-400',
  emerald:'text-emerald-400',
  amber:  'text-amber-400',
};
const iconBg: Record<string, string> = {
  violet: 'bg-violet-500/15 border-violet-500/25',
  cyan:   'bg-cyan-500/15 border-cyan-500/25',
  pink:   'bg-pink-500/15 border-pink-500/25',
  emerald:'bg-emerald-500/15 border-emerald-500/25',
  amber:  'bg-amber-500/15 border-amber-500/25',
};

const stats = [
  { label: 'Active Sellers',   value: '12,000+', icon: Users },
  { label: 'Revenue Processed',value: '₹48 Cr+',  icon: TrendingUp },
  { label: 'Posts Scheduled',  value: '2.4M+',   icon: Share2 },
  { label: 'Orders Automated', value: '890K+',   icon: ShoppingCart },
];

const testimonials = [
  { name: 'Priya Sharma',   role: 'Fashion Boutique Owner',  text: 'AutoBot360 tripled my Instagram sales in 2 months. The AI replies handle everything while I sleep.', rating: 5, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
  { name: 'Rahul Mehta',    role: 'Electronics Reseller',    text: 'The automated checkout from comments is a game-changer. My conversion rate went from 3% to 18%.', rating: 5, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face' },
  { name: 'Anjali Verma',   role: 'Handmade Jewellery Store', text: 'Best investment for my small business. Order management and WhatsApp alerts save me 4 hours daily.', rating: 5, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face' },
];

const platforms = [
  { icon: Instagram, name: 'Instagram', color: 'from-pink-500 to-orange-400' },
  { icon: Facebook,  name: 'Facebook',  color: 'from-blue-500 to-blue-600' },
  { icon: Youtube,   name: 'YouTube',   color: 'from-red-500 to-red-600' },
  { icon: Globe,     name: 'TikTok',    color: 'from-slate-600 to-slate-700' },
];

const stagger = { show: { transition: { staggerChildren: 0.1 } } };
const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.07] bg-[#060a12]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-900/40">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">AutoBot360</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/pricing" className="text-sm text-white/55 transition hover:text-white/90">Pricing</Link>
            <a href="#features"   className="text-sm text-white/55 transition hover:text-white/90">Features</a>
            <a href="#how"        className="text-sm text-white/55 transition hover:text-white/90">How it works</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"  className="hidden text-sm font-medium text-white/60 transition hover:text-white sm:block">Log in</Link>
            <Link href="/signup" className="btn-primary py-2.5 px-5 text-sm">Start free <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-6 pb-16 pt-32 md:pt-40">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-600/20 to-transparent blur-3xl" />
          <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-pink-600/12 to-transparent blur-3xl" />
          <div className="absolute left-0 bottom-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-cyan-600/10 to-transparent blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="badge badge-violet mb-6 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Powered by Gemini AI
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl font-black leading-[1.08] tracking-tight md:text-7xl lg:text-8xl"
          >
            Sell on Social.
            <br />
            <span className="gradient-text">Powered by AI.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/55 md:text-xl"
          >
            AutoBot360 automates your entire social commerce pipeline — AI content creation,
            comment replies, seamless payments, and order management. All in one powerful dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link href="/signup" className="btn-primary px-8 py-3.5 text-base">
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary px-8 py-3.5 text-base">
              <Play className="h-4 w-4 text-violet-400" /> Watch demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/40"
          >
            {['No credit card required', 'Free 14-day trial', 'Cancel anytime'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{t}</span>
            ))}
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="glow-border overflow-hidden rounded-2xl shadow-2xl shadow-black/60">
            <div className="rounded-2xl border border-white/10 bg-[#0d1120] p-4 md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
                <div className="ml-4 flex-1 rounded-md bg-white/5 px-3 py-1 text-xs text-white/30">app.autobot360.com/dashboard</div>
              </div>
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop&crop=center"
                alt="Dashboard preview"
                className="w-full rounded-xl object-cover opacity-80"
                style={{ aspectRatio: '16/7' }}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute -inset-x-20 -bottom-10 h-40 bg-gradient-to-t from-[#060a12] to-transparent" />
        </motion.div>
      </section>

      {/* ── Platform logos ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-10 text-sm font-semibold uppercase tracking-widest text-white/30">Works with all major platforms</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {platforms.map((p) => (
              <div key={p.name} className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-sm">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${p.color}`}>
                  <p.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-white/70">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 py-12">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
          className="mx-auto grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="metric-card text-center">
              <s.icon className="mx-auto mb-2 h-5 w-5 text-violet-400" />
              <div className="text-3xl font-black gradient-text">{s.value}</div>
              <div className="mt-1 text-sm text-white/45">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
            <span className="badge badge-cyan mb-4 inline-block">Features</span>
            <h2 className="text-4xl font-black md:text-5xl">Everything you need to<br /><span className="gradient-text">sell on social</span></h2>
            <p className="mx-auto mt-5 max-w-xl text-white/50">One platform for your entire social commerce workflow. No more switching between apps.</p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="glass-card group cursor-default p-6">
                <div className={`icon-pill mb-4 ${iconBg[f.color]} border`} style={{ background: 'none' }}>
                  <f.icon className={`h-5 w-5 ${iconColor[f.color]}`} />
                </div>
                <h3 className="mb-2 font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
            <span className="badge badge-violet mb-4 inline-block">How it works</span>
            <h2 className="text-4xl font-black md:text-5xl">From post to payment<br /><span className="gradient-text-warm">in 3 simple steps</span></h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '01', title: 'Create & Schedule', desc: 'AI writes your social post captions and schedules them across all platforms with one click.', img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=250&fit=crop' },
              { step: '02', title: 'AI Engages for You', desc: 'Our AI monitors every comment and DM, identifies buyers, and replies with product info and payment links.', img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop' },
              { step: '03', title: 'Orders Flow In',    desc: 'Customers pay directly from comments via Razorpay. You get WhatsApp alerts and orders appear in your dashboard.', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=250&fit=crop' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6 }} viewport={{ once: true }}
                className="glass-card overflow-hidden"
              >
                <div className="relative">
                  <img src={item.img} alt={item.title} className="h-44 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-xl bg-black/50 px-3 py-1.5 text-xs font-black text-violet-300 backdrop-blur-sm">{item.step}</span>
                </div>
                <div className="p-5">
                  <h3 className="mb-2 font-bold text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-14 text-center">
            <span className="badge badge-emerald mb-4 inline-block">Testimonials</span>
            <h2 className="text-4xl font-black">Loved by thousands<br /><span className="gradient-text">of Indian sellers</span></h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp} className="glass-card p-6">
                <div className="mb-4 flex gap-1">
                  {[...Array(t.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-white/70">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-violet-500/30" />
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-white/40">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="glow-card mx-auto max-w-3xl px-8 py-16 text-center md:px-16"
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Trusted by 12,000+ sellers</span>
          </div>
          <h2 className="text-4xl font-black md:text-5xl">Ready to automate<br /><span className="gradient-text">your social sales?</span></h2>
          <p className="mx-auto mt-5 max-w-md text-white/50">
            Join thousands of sellers across India who use AutoBot360 to grow their social commerce business on autopilot.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup" className="btn-primary px-10 py-3.5 text-base">
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="btn-secondary px-8 py-3.5 text-base">View pricing</Link>
          </div>
          <p className="mt-5 text-xs text-white/30">No credit card required · 14-day free trial · Cancel anytime</p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.07] px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-700">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold gradient-text">AutoBot360</span>
          </div>
          <p className="text-sm text-white/30">© {new Date().getFullYear()} AutoBot360. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-white/35">
            <a href="#" className="hover:text-white/70 transition">Privacy</a>
            <a href="#" className="hover:text-white/70 transition">Terms</a>
            <Link href="/pricing" className="hover:text-white/70 transition">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
