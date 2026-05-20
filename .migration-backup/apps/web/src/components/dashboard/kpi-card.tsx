'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  icon: LucideIcon;
}

export function KPICard({ title, value, change, icon: Icon }: KPICardProps) {
  const positive = change >= 0;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <Icon className="h-4 w-4 text-violet-400" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className={cn('mt-1 text-xs', positive ? 'text-emerald-400' : 'text-red-400')}>
        {positive ? '+' : ''}{change}% vs last period
      </p>
    </motion.div>
  );
}
