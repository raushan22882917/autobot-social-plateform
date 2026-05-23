import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AutoBot360 | AI-Powered Social Commerce',
  description:
    'The world\'s first multi-platform AI commerce engine. Automate engagement and checkout across Instagram, WhatsApp, Facebook and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
