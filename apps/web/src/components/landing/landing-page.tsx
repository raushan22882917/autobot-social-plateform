'use client';

import Link from 'next/link';
import {
  Sparkles,
  PlayCircle,
  Camera,
  Users,
  MessageCircle,
  Brain,
  Smile,
  ShoppingCart,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { LANDING_IMAGES } from './landing-images';
import styles from './landing.module.css';
import { useLandingInteractions } from './use-landing-effects';

const TICKER_ITEMS = [
  { dot: '#25D366', text: 'Transaction: $428.00 via Instagram (New York)' },
  { dot: '#1877F2', text: 'New Lead: Intent identified in Facebook DM (London)' },
  { dot: '#25D366', text: 'Active Bots: 12,482 globally' },
  { dot: '#25D366', text: 'WhatsApp Order: Paid successfully (Mumbai)' },
];

const PLATFORM_GRID = [
  { img: LANDING_IMAGES.instagram, label: 'IG Elite', color: '#E1306C', pulse: styles.pulseIg },
  { img: LANDING_IMAGES.facebook, label: 'Meta Commerce', color: '#1877F2', pulse: styles.pulseFb },
  { img: LANDING_IMAGES.whatsapp, label: 'WhatsApp Direct', color: '#25D366', pulse: styles.pulseWa },
];

const PLATFORM_CARDS = [
  {
    border: '#E1306C',
    icon: Camera,
    pulse: styles.pulseIg,
    title: 'Instagram Elite',
    desc: 'AI-driven DM closures and comment-to-checkout flows. Turn every "Price?" into a "Paid!".',
    img: LANDING_IMAGES.instagram,
    iconColor: '#E1306C',
  },
  {
    border: '#1877F2',
    icon: Users,
    pulse: styles.pulseFb,
    title: 'Meta Commerce',
    desc: 'Automated ad comment responses and Shop sync. Scale your Facebook campaigns with zero manual labor.',
    img: LANDING_IMAGES.facebook,
    iconColor: '#1877F2',
  },
  {
    border: '#25D366',
    icon: MessageCircle,
    pulse: styles.pulseWa,
    title: 'WhatsApp Direct',
    desc: 'Real-time order alerts and abandoned cart recovery. 98% open rates for your checkout links.',
    img: LANDING_IMAGES.whatsapp,
    iconColor: '#25D366',
  },
];

const BRAIN_FEATURES = [
  {
    icon: Brain,
    bg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#60a5fa',
    title: 'Intent Recognition',
    desc: 'Understands if a user is browsing, comparing, or ready to buy with 99.4% accuracy.',
    delay: '0s',
  },
  {
    icon: Smile,
    bg: 'rgba(168, 85, 247, 0.2)',
    iconColor: '#c084fc',
    title: 'Sentiment Tuning',
    desc: "Adapts tone of voice to match your brand and the customer's mood in real-time.",
    delay: '0.5s',
  },
  {
    icon: ShoppingCart,
    bg: 'rgba(236, 72, 153, 0.2)',
    iconColor: '#f472b6',
    title: 'Conversion Optimization',
    desc: 'Dynamically offers discounts or upsells based on the conversation context.',
    delay: '1s',
  },
];

const STATS = [
  { value: '12k+', label: 'Active Sellers', color: '#E1306C' },
  { value: '₹48Cr+', label: 'Revenue Processed', color: '#1877F2' },
  { value: '2.4M+', label: 'AI Chats', color: '#25D366' },
  { value: '99%', label: 'Response Rate', color: '#FF0000' },
];

const ANALYTICS_FEATURES = [
  'Real-time sentiment heatmaps',
  'Cross-platform attribution tracking',
  'Predictive inventory management',
];

function TickerContent() {
  return (
    <div className={styles.tickerContent}>
      {TICKER_ITEMS.map((item) => (
        <span key={item.text} className={styles.tickerItem}>
          <span className={styles.tickerDot} style={{ background: item.dot }} />
          {item.text}
        </span>
      ))}
    </div>
  );
}

export function LandingPage() {
  const { rootRef, progress, bgGradient, parallax, heroVisible } = useLandingInteractions({
    sectionActive: styles.scrollRevealActive,
    staggerVisible: styles.staggerItemVisible,
  });

  return (
    <div ref={rootRef} className={styles.landing}>
      <div className={styles.scrollProgress} style={{ width: `${progress}%` }} aria-hidden />
      <div className={styles.bgOverlay} style={{ background: bgGradient }} aria-hidden />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerBrand}>
            <Link href="/" className={styles.logo}>
              AutoBot360
            </Link>
            <nav className={styles.nav} aria-label="Main">
              <a href="#features" className={styles.navLink}>Features</a>
              <a href="#how-it-works" className={`${styles.navLink} ${styles.navLinkFb}`}>How it works</a>
              <a href="#platforms" className={`${styles.navLink} ${styles.navLinkWa}`}>Platforms</a>
              <a href="#pricing" className={styles.navLink}>Pricing</a>
            </nav>
          </div>
          <div className={styles.headerActions}>
            <Link href="/login" className={styles.loginLink}>Login</Link>
            <Link href="/signup" className={`${styles.primaryBtn} ${styles.magneticBtn}`} data-magnetic>
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <section
          className={`${styles.hero} ${styles.scrollReveal} ${styles.scrollRevealActive}`}
          data-scroll-reveal
        >
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroContent}>
                <div className={styles.badge}>
                  <Sparkles size={16} aria-hidden />
                  Global Social Intelligence
                </div>

                <h1 className={styles.heroTitle}>
                  <span className={styles.heroTitleLine}>
                    <span className={`${styles.revealWord} ${heroVisible ? styles.revealWordActive : ''}`} style={{ transitionDelay: '0s' }}>Sell </span>
                    <span className={`${styles.revealWord} ${heroVisible ? styles.revealWordActive : ''}`} style={{ transitionDelay: '0.06s' }}>on </span>
                    <span className={`${styles.revealWord} ${heroVisible ? styles.revealWordActive : ''}`} style={{ transitionDelay: '0.12s' }}>Social.</span>
                  </span>
                  <span className={styles.heroTitlePlatforms}>
                    <span className={`${styles.revealWord} ${styles.platformIg} ${heroVisible ? styles.revealWordActive : ''}`} style={{ transitionDelay: '0.2s' }}>Instagram. </span>
                    <span className={`${styles.revealWord} ${heroVisible ? styles.revealWordActive : ''}`} style={{ transitionDelay: '0.28s', color: '#25D366' }}>WhatsApp. </span>
                    <span className={`${styles.revealWord} ${heroVisible ? styles.revealWordActive : ''}`} style={{ transitionDelay: '0.36s', color: '#1877F2' }}>FB.</span>
                  </span>
                </h1>

                <p className={styles.heroDesc}>
                  The world&apos;s first multi-platform AI commerce engine. Automate engagement and checkout across all social giants simultaneously.
                </p>

                <div className={styles.heroCtas}>
                  <Link href="/signup" className={`${styles.shimmerBtn} ${styles.magneticBtn}`} data-magnetic>
                    Launch Autopilot
                  </Link>
                  <Link href="/login" className={`${styles.secondaryBtn} ${styles.magneticBtn}`} data-magnetic>
                    <PlayCircle size={20} aria-hidden />
                    Watch Demo
                  </Link>
                </div>
              </div>

              <div
                className={`${styles.heroVisual} ${styles.parallaxLayer}`}
                data-tilt-container
                style={{ transform: `translate(${parallax.x * 0.04}px, ${parallax.y * 0.04}px)` }}
              >
                <div className={styles.heroGlow} aria-hidden />
                <div className={`${styles.glassCard} ${styles.tiltCard} ${styles.heroImageWrap}`} data-tilt-card>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LANDING_IMAGES.hero} alt="Connect and Sell Flow" className={styles.heroImage} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform icons */}
        <section className={`${styles.platformGridSection} ${styles.grid3d}`}>
          <div className={styles.container}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>The Multi-Platform Grid</h2>
              <p className={styles.sectionDesc}>
                Seamless synchronization across the 3D commerce landscape.
              </p>
            </header>
            <div className={styles.platformIcons}>
              {PLATFORM_GRID.map((p) => (
                <div key={p.label} className={styles.platformIconCell} data-tilt-container>
                  <div
                    className={`${styles.glassCard} ${styles.tiltCard} ${styles.platformIconBox} ${p.pulse}`}
                    data-tilt-card
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <p className={styles.platformIconLabel} style={{ color: p.color }}>{p.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform cards */}
        <section
          id="platforms"
          className={`${styles.platformsSection} ${styles.scrollReveal}`}
          data-scroll-reveal
        >
          <div className={styles.container}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Optimized for every channel</h2>
            </header>
            <div className={styles.platformCards}>
              {PLATFORM_CARDS.map((card) => (
                <div key={card.title} data-tilt-container>
                  <article
                    className={`${styles.glassCard} ${styles.tiltCard} ${styles.platformCard}`}
                    style={{ borderTopColor: card.border }}
                    data-tilt-card
                  >
                    <div
                      className={`${styles.platformCardIcon} ${card.pulse}`}
                      style={{ background: `${card.border}14` }}
                    >
                      <card.icon size={28} style={{ color: card.iconColor }} aria-hidden />
                    </div>
                    <h3 className={styles.platformCardTitle}>{card.title}</h3>
                    <p className={styles.platformCardDesc}>{card.desc}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.img} alt="" className={styles.platformCardImg} />
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Brain */}
        <section
          id="how-it-works"
          className={`${styles.brainSection} ${styles.scrollReveal}`}
          data-scroll-reveal
        >
          <div className={styles.container}>
            <div className={styles.brainGrid}>
              <div className={styles.staggerItem} data-stagger>
                <h2 className={styles.brainTitle}>The Gemini AI Brain</h2>
                <ul className={styles.brainList}>
                  {BRAIN_FEATURES.map((f) => (
                    <li key={f.title} className={styles.brainItem}>
                      <div
                        className={`${styles.brainItemIcon} ${styles.brainNode}`}
                        style={{ background: f.bg, animationDelay: f.delay }}
                      >
                        <f.icon size={20} style={{ color: f.iconColor }} aria-hidden />
                      </div>
                      <div>
                        <h4 className={styles.brainItemTitle}>{f.title}</h4>
                        <p className={styles.brainItemDesc}>{f.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`${styles.brainVisual} ${styles.staggerItem}`} data-stagger data-tilt-container>
                <div className={styles.tiltCard} data-tilt-card>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LANDING_IMAGES.aiBrain} alt="AI Brain Core" className={styles.brainImage} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live network */}
        <section className={`${styles.liveSection} ${styles.scrollReveal}`} data-scroll-reveal>
          <div className={styles.container}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Live Commerce Network</h2>
              <p className={styles.sectionDesc}>
                Watch transactions happen in real-time across the world.
              </p>
            </header>
          </div>
          <div className={`${styles.containerWide} ${styles.staggerItem}`} data-stagger>
            <div className={styles.liveShowcase} data-tilt-container>
              <div className={styles.tiltCard} data-tilt-card style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LANDING_IMAGES.globalNetwork}
                  alt="Global Commerce Network"
                  className={styles.liveImage}
                />
                <div className={styles.liveOverlay} aria-hidden />
                <div className={styles.liveBadge}>
                  <span className={styles.pingDot} aria-hidden />
                  <span>
                    Live Pulse: <strong style={{ color: '#E1306C' }}>1,248</strong> transactions/hr
                  </span>
                </div>
                <div className={styles.tickerWrap}>
                  <div className={styles.ticker}>
                    <TickerContent />
                    <TickerContent />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section id="pricing" className={styles.statsSection}>
          <div className={styles.container}>
            <div className={styles.statsGrid}>
              {STATS.map((s) => (
                <div key={s.label} className={styles.statCell}>
                  <p className={styles.statValue} style={{ color: s.color }}>{s.value}</p>
                  <p className={styles.statLabel}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Analytics */}
        <section id="features" className={`${styles.analyticsSection} ${styles.scrollReveal}`} data-scroll-reveal>
          <div className={styles.container}>
            <div className={styles.analyticsGrid}>
              <div className={`${styles.analyticsVisual} ${styles.staggerItem}`} data-stagger data-tilt-container>
                <div className={styles.analyticsImageWrap}>
                  <div className={styles.analyticsImageGlow} aria-hidden />
                  <div className={styles.tiltCard} data-tilt-card>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={LANDING_IMAGES.dashboard}
                      alt="Product Analysis Dashboard"
                      className={styles.analyticsImage}
                    />
                  </div>
                </div>
              </div>
              <div className={`${styles.analyticsCopy} ${styles.staggerItem}`} data-stagger>
                <div className={styles.analyticsBadge}>
                  <BarChart3 size={16} aria-hidden />
                  Production-Ready Analytics
                </div>
                <h2 className={styles.analyticsTitle}>Turn Conversations into Data</h2>
                <p className={styles.analyticsDesc}>
                  Our dashboard provides deep insights into product reception, sentiment trends, and conversion velocity across all social channels. Stop guessing and start scaling with precision.
                </p>
                <ul className={styles.featureList}>
                  {ANALYTICS_FEATURES.map((item) => (
                    <li key={item} className={styles.featureItem}>
                      <CheckCircle2 size={20} className={styles.pulseWa} style={{ color: '#25D366', flexShrink: 0 }} aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className={styles.btnRow}>
                  <Link href="/signup" className={`${styles.darkBtn} ${styles.magneticBtn}`} data-magnetic>
                    Explore Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={`${styles.ctaSection} ${styles.scrollReveal}`} data-scroll-reveal>
          <div className={styles.container}>
            <div className={styles.ctaCard} data-tilt-container>
              <div className={styles.ctaGradient} aria-hidden />
              <div className={`${styles.ctaInner} ${styles.tiltCard}`} data-tilt-card>
                <h2 className={styles.ctaTitle}>Ready to dominate social commerce?</h2>
                <div className={styles.ctaButtons}>
                  <Link href="/signup" className={`${styles.ctaPrimary} ${styles.magneticBtn}`} data-magnetic>
                    Get Started Free
                  </Link>
                  <Link href="/pricing" className={`${styles.ctaSecondary} ${styles.magneticBtn}`} data-magnetic>
                    Talk to Sales
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <span className={`${styles.logo} ${styles.platformIg}`}>AutoBot360</span>
              <p className={styles.footerBrandDesc}>
                Pioneering the future of AI-driven conversational commerce across the globe.
              </p>
            </div>
            <div>
              <p className={styles.footerColTitle}>Platforms</p>
              <ul className={styles.footerLinks}>
                <li><a href="#platforms">Instagram Commerce</a></li>
                <li><a href="#platforms">Facebook Automation</a></li>
                <li><a href="#platforms">WhatsApp Business</a></li>
                <li><a href="#platforms">YouTube Shopping</a></li>
              </ul>
            </div>
            <div>
              <p className={styles.footerColTitle}>Company</p>
              <ul className={styles.footerLinks}>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/login">Login</Link></li>
                <li><Link href="/signup">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <p className={styles.footerColTitle}>Join the Community</p>
              <div className={styles.footerSocial}>
                <div className={`${styles.socialIcon} ${styles.pulseIg}`} style={{ background: 'rgba(225,48,108,0.1)' }}>
                  <Camera size={18} style={{ color: '#E1306C' }} aria-hidden />
                </div>
                <div className={`${styles.socialIcon} ${styles.pulseFb}`} style={{ background: 'rgba(24,119,242,0.1)' }}>
                  <Users size={18} style={{ color: '#1877F2' }} aria-hidden />
                </div>
                <div className={`${styles.socialIcon} ${styles.pulseWa}`} style={{ background: 'rgba(37,211,102,0.1)' }}>
                  <MessageCircle size={18} style={{ color: '#25D366' }} aria-hidden />
                </div>
              </div>
              <p className={styles.footerCopy}>
                © {new Date().getFullYear()} AutoBot360 AI. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
