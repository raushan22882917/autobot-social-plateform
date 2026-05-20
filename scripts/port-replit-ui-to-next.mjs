#!/usr/bin/env node
/**
 * Copy Replit artifact UI (artifacts/autobot360) into Next.js app (apps/web).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactSrc = path.join(root, 'artifacts/autobot360/src');
const webSrc = path.join(root, 'apps/web/src');

const PAGE_MAP = [
  ['pages/HomePage.tsx', 'app/page.tsx'],
  ['pages/LoginPage.tsx', 'app/login/page.tsx'],
  ['pages/SignupPage.tsx', 'app/signup/page.tsx'],
  ['pages/PricingPage.tsx', 'app/pricing/page.tsx'],
  ['pages/CheckoutPage.tsx', 'app/checkout/[sessionId]/page.tsx'],
  ['pages/PublicProductPage.tsx', 'app/p/[slug]/page.tsx'],
  ['pages/DashboardPage.tsx', 'app/(dashboard)/dashboard/page.tsx'],
  ['pages/ProductsPage.tsx', 'app/(dashboard)/products/page.tsx'],
  ['pages/ProductAnalysisPage.tsx', 'app/(dashboard)/product-analysis/page.tsx'],
  ['pages/SocialPage.tsx', 'app/(dashboard)/social/page.tsx'],
  ['pages/StudioPage.tsx', 'app/(dashboard)/studio/page.tsx'],
  ['pages/PostsPage.tsx', 'app/(dashboard)/posts/page.tsx'],
  ['pages/OrdersPage.tsx', 'app/(dashboard)/orders/page.tsx'],
  ['pages/PaymentsPage.tsx', 'app/(dashboard)/payments/page.tsx'],
  ['pages/AnalyticsPage.tsx', 'app/(dashboard)/analytics/page.tsx'],
  ['pages/NotificationsPage.tsx', 'app/(dashboard)/notifications/page.tsx'],
  ['pages/SettingsPage.tsx', 'app/(dashboard)/settings/page.tsx'],
];

const COPY_DIRS = [
  ['components', 'components'],
  ['hooks', 'hooks'],
];

const UI_FILES = [
  'button.tsx',
  'input.tsx',
  'label.tsx',
  'Modal.tsx',
  'Card.tsx',
  'Badge.tsx',
  'Card.module.css',
  'Badge.module.css',
];

function transform(content) {
  let c = content;

  if (!c.includes("'use client'") && !c.includes('"use client"')) {
    c = "'use client';\n\n" + c;
  }

  c = c.replace(/import \{ Link \} from ['"]wouter['"];\n/g, "import Link from 'next/link';\n");
  c = c.replace(
    /import \{ Link, useLocation \} from ['"]wouter['"];\n/g,
    "import Link from 'next/link';\nimport { usePathname, useSearchParams } from 'next/navigation';\n"
  );
  c = c.replace(
    /import \{ useLocation, Link \} from ['"]wouter['"];\n/g,
    "import Link from 'next/link';\nimport { usePathname, useSearchParams } from 'next/navigation';\n"
  );
  c = c.replace(
    /import \{ useParams, useLocation \} from ['"]wouter['"];\n/g,
    "import { useParams, useRouter } from 'next/navigation';\n"
  );
  c = c.replace(
    /import \{ useLocation \} from ['"]wouter['"];\n/g,
    "import { usePathname, useSearchParams, useRouter } from 'next/navigation';\n"
  );

  c = c.replace(/const \[, setLocation\] = useLocation\(\);/g, 'const router = useRouter();');
  c = c.replace(/setLocation\(/g, 'router.push(');

  c = c.replace(
    /const \[location\] = useLocation\(\);/g,
    `const pathname = usePathname();
  const searchParams = useSearchParams();
  const location = pathname + (searchParams?.toString() ? \`?\${searchParams.toString()}\` : '');`
  );

  c = c.replace(/useParams<\{[^}]+\}>\(\)/g, 'useParams()');
  c = c.replace(/params\.slug/g, '(params?.slug as string)');
  c = c.replace(/params\.sessionId/g, '(params?.sessionId as string)');

  c = c.replace(/@\/pages\/studio\.module\.css/g, './studio.module.css');
  c = c.replace(/@\/pages\/product-analysis\.module\.css/g, './product-analysis.module.css');
  c = c.replace(
    /@\/app\/\(dashboard\)\/product-analysis\/product-analysis\.module\.css/g,
    './product-analysis.module.css'
  );

  c = c.replace(/<Link to=/g, '<Link href=');

  return c;
}

function copyDir(srcRel, destRel, filter) {
  const src = path.join(artifactSrc, srcRel);
  const dest = path.join(webSrc, destRel);
  if (!fs.existsSync(src)) return;

  function walk(dir, base = '') {
    for (const name of fs.readdirSync(dir)) {
      const rel = path.join(base, name);
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        walk(full, rel);
      } else if (!filter || filter(rel)) {
        const out = path.join(dest, rel);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        let content = fs.readFileSync(full, 'utf8');
        if (name.endsWith('.tsx') || name.endsWith('.ts')) {
          content = transform(content);
        }
        fs.writeFileSync(out, content);
      }
    }
  }
  walk(src);
}

function main() {
  console.log('Porting Replit UI → apps/web …');

  for (const [from, to] of PAGE_MAP) {
    const src = path.join(artifactSrc, from);
    const dest = path.join(webSrc, to);
    if (!fs.existsSync(src)) {
      console.warn('  skip (missing):', from);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const content = transform(fs.readFileSync(src, 'utf8'));
    fs.writeFileSync(dest, content);
    console.log('  page:', to);
  }

  for (const [from, to] of COPY_DIRS) {
    copyDir(from, to, (rel) => !rel.includes('/ui/') || UI_FILES.some((f) => rel.endsWith(f)));
    console.log('  dir:', to);
  }

  // Full ui subset
  const uiSrc = path.join(artifactSrc, 'components/ui');
  const uiDest = path.join(webSrc, 'components/ui');
  fs.mkdirSync(uiDest, { recursive: true });
  for (const f of UI_FILES) {
    const s = path.join(uiSrc, f);
    if (!fs.existsSync(s)) continue;
    let content = fs.readFileSync(s, 'utf8');
    if (f.endsWith('.tsx')) content = transform(content);
    fs.writeFileSync(path.join(uiDest, f), content);
    console.log('  ui:', f);
  }

  // CSS modules for studio / product-analysis
  for (const css of ['pages/studio.module.css', 'pages/product-analysis.module.css']) {
    const s = path.join(artifactSrc, css);
    if (!fs.existsSync(s)) continue;
    const destName = css.replace('pages/', 'app/(dashboard)/').replace('studio.module', 'studio/studio.module');
    const dest = path.join(
      webSrc,
      css.includes('product-analysis')
        ? 'app/(dashboard)/product-analysis/product-analysis.module.css'
        : 'app/(dashboard)/studio/studio.module.css'
    );
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(s, dest);
    console.log('  css:', path.basename(dest));
  }

  // Replit global component styles → globals.css append marker
  const indexCss = fs.readFileSync(path.join(artifactSrc, 'index.css'), 'utf8');
  const marker = '/* === REPLIT DESIGN SYSTEM === */';
  const globalsPath = path.join(webSrc, 'app/globals.css');
  let globals = fs.readFileSync(globalsPath, 'utf8');
  const layerStart = indexCss.indexOf('@layer components');
  const layerEnd = indexCss.lastIndexOf('}') + 1;
  const componentsLayer = indexCss.slice(layerStart, layerEnd);
  const baseStart = indexCss.indexOf('@layer base');
  const baseEnd = indexCss.indexOf('@layer components');
  const baseLayer = indexCss.slice(baseStart, baseEnd);

  if (!globals.includes(marker)) {
    globals =
      marker +
      '\n' +
      baseLayer +
      '\n' +
      componentsLayer +
      '\n\n' +
      globals.replace(':root {', ':root {\n  /* Replit tokens */\n  --app-font-sans: Inter, system-ui, sans-serif;');
    // Merge body background from artifact
    globals = globals.replace(
      /@apply bg-background text-foreground antialiased;/,
      '@apply antialiased;\n    font-family: var(--app-font-sans, Inter, system-ui, sans-serif);\n    color: hsl(var(--foreground));\n    background-color: #060a12;\n    background-image:\n      radial-gradient(ellipse 130% 90% at 50% -5%, rgba(139,92,246,0.15) 0%, transparent 55%),\n      radial-gradient(ellipse 70% 60% at 92% 20%, rgba(236,72,153,0.09) 0%, transparent 50%),\n      radial-gradient(ellipse 60% 50% at 8% 85%, rgba(6,182,212,0.07) 0%, transparent 50%);\n    background-attachment: fixed;'
    );
    fs.writeFileSync(globalsPath, globals);
    console.log('  updated: app/globals.css');
  }

  console.log('Done.');
}

main();
