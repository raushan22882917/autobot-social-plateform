# AutoBot360 — UI/UX Architecture

## Design System

### Visual Language
- **Style:** Glassmorphism + premium SaaS (Shopify × Stripe × Buffer)
- **Modes:** Dark (default) + Light via `next-themes`
- **Typography:** Inter (UI) + JetBrains Mono (code/metrics)
- **Radius:** `rounded-xl` (12px) cards, `rounded-2xl` modals
- **Motion:** Framer Motion — page transitions, card hover, chart animations

### Color Tokens (CSS Variables)

```css
:root {
  --background: 222 47% 6%;
  --foreground: 210 40% 98%;
  --card: 222 47% 8% / 0.6;
  --primary: 262 83% 58%;
  --primary-gradient: linear-gradient(135deg, #8B5CF6, #06B6D4);
  --accent: 174 72% 46%;
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --destructive: 0 84% 60%;
  --glass: rgba(255,255,255,0.05);
  --glass-border: rgba(255,255,255,0.1);
  --glow: 0 0 40px rgba(139, 92, 246, 0.15);
}
```

---

## Page Map (20 Pages)

| # | Route | Page | Key Components |
|---|-------|------|----------------|
| 1 | `/` | Landing | Hero, Features, CTA, Testimonials |
| 2 | `/pricing` | Pricing | Plan cards, comparison table |
| 3 | `/login` | Login | Auth form, social login |
| 4 | `/signup` | Signup | Multi-step onboarding |
| 5 | `/dashboard` | Dashboard | KPI cards, charts, activity feed |
| 6 | `/products` | Products | Data table, filters, bulk actions |
| 7 | `/products/[id]` | Product Edit | Form, media upload, AI description |
| 8 | `/social` | Social Connections | Platform cards, connect buttons |
| 9 | `/posts` | Scheduled Posts | Calendar + list view |
| 10 | `/analytics` | Analytics | Charts, AI insights panel |
| 11 | `/orders` | Orders | Order table, status badges |
| 12 | `/automation` | AI Automation | Rules builder, toggle switches |
| 13 | `/whatsapp` | WhatsApp | Template manager, logs |
| 14 | `/customers` | Customers | CRM table, conversation view |
| 15 | `/billing` | Billing | Plan, usage, invoices |
| 16 | `/settings` | Settings | Profile, team, API keys |
| 17 | `/notifications` | Notification Center | Realtime feed |
| 18 | `/assistant` | AI Assistant | Chat interface |
| 19 | `/checkout/[sessionId]` | Checkout | Cart, address, Razorpay |
| 20 | `/p/[slug]` | Public Product | Product gallery, Buy Now |
| 21 | `/m/dashboard` | Mobile Dashboard | Bottom nav, swipe cards |

---

## Layout Architecture

```
┌────────────────────────────────────────────────────────────┐
│  TopBar: Search │ Notifications │ AI Assistant │ Avatar   │
├──────────┬─────────────────────────────────────────────────┤
│ Sidebar  │  Main Content Area                               │
│          │  ┌─────────────────────────────────────────┐   │
│ Dashboard│  │  Page Header + Actions                   │   │
│ Products │  ├─────────────────────────────────────────┤   │
│ Social   │  │  Content (cards, tables, charts)         │   │
│ Posts    │  │                                          │   │
│ Analytics│  └─────────────────────────────────────────┘   │
│ Orders   │                                                  │
│ ...      │                                                  │
├──────────┴─────────────────────────────────────────────────┤
│  Mobile: Bottom Navigation (5 icons)                        │
└────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation
```typescript
const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Social', href: '/social', icon: Share2 },
  { label: 'Posts', href: '/posts', icon: Calendar },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'AI Automation', href: '/automation', icon: Bot },
  { label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { label: 'AI Assistant', href: '/assistant', icon: Sparkles },
  // Bottom section
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
];
```

---

## Component Architecture

```
apps/web/src/
├── app/                          # Next.js 15 App Router
│   ├── (marketing)/              # Landing, Pricing
│   ├── (auth)/                   # Login, Signup
│   ├── (dashboard)/              # Authenticated layout
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── social/
│   │   ├── posts/
│   │   ├── analytics/
│   │   ├── orders/
│   │   ├── automation/
│   │   ├── whatsapp/
│   │   ├── customers/
│   │   ├── billing/
│   │   ├── settings/
│   │   ├── notifications/
│   │   └── assistant/
│   ├── checkout/[sessionId]/
│   ├── p/[slug]/                 # Public product
│   └── m/dashboard/              # Mobile
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Sidebar, TopBar, MobileNav
│   ├── dashboard/                # KPICard, ActivityFeed, Charts
│   ├── products/                 # ProductForm, MediaUpload
│   ├── social/                   # PlatformCard, ConnectButton
│   ├── posts/                    # PostCalendar, ScheduleForm
│   ├── analytics/                # EngagementChart, SalesChart
│   ├── orders/                   # OrderTable, StatusBadge
│   └── shared/                   # GlassCard, GradientButton, AIOrb
├── lib/
│   ├── api.ts                    # API client (fetch wrapper)
│   ├── firebase.ts               # Client SDK
│   ├── auth.tsx                  # Auth context provider
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useRealtime.ts            # Firestore onSnapshot
│   ├── useNotifications.ts
│   └── useTheme.ts
└── stores/
    └── app-store.ts              # Zustand global state
```

---

## Key UI Components

### GlassCard
```tsx
// Frosted glass container used everywhere
<div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-glow">
  {children}
</motion.div>
```

### KPICard (Dashboard)
- Animated counter (Framer Motion `useSpring`)
- Sparkline chart (recharts)
- Trend badge (+12.5% ↑ green)

### AI Assistant Orb
- Pulsing gradient sphere
- Chat panel slide-in from right
- Streaming Gemini responses

---

## State Management

| State Type | Solution |
|------------|----------|
| Auth user | React Context + Firebase onAuthStateChanged |
| Server data | TanStack Query (React Query) |
| UI state | Zustand (sidebar collapsed, modals) |
| Realtime | Firestore onSnapshot hooks |
| Form state | React Hook Form + Zod |

---

## Realtime Updates

```typescript
// hooks/useRealtime.ts
export function useNotifications(tenantId: string) {
  return useQuery({
    queryKey: ['notifications', tenantId],
    queryFn: () => api.get('/notifications'),
  });
  // + Firestore listener for instant updates
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notifications'),
        where('tenantId', '==', tenantId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(20)
      ),
      (snap) => { /* update cache */ }
    );
    return unsub;
  }, [tenantId]);
}
```

---

## Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 640px | Mobile bottom nav, stacked cards |
| 640-1024px | Collapsed sidebar (icons only) |
| > 1024px | Full sidebar + multi-column dashboard |
| > 1440px | 4-column KPI grid, side AI panel |

---

## Animation Patterns

```typescript
// Page transition
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20 },
};

// Stagger children (dashboard cards)
const containerVariants = {
  animate: { transition: { staggerChildren: 0.1 } },
};
```
