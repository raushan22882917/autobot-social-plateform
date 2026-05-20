'use client';


import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

interface StatsOverviewProps {
  stats: StatItem[];
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          variants={itemVariants}
          className="glass rounded-lg border border-white/10 p-4 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/5"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-white/70">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
            </div>
            <div
              className={cn(
                'rounded-full p-2',
                stat.trend === 'up' && 'bg-emerald-500/20',
                stat.trend === 'down' && 'bg-red-500/20',
                stat.trend === 'neutral' && 'bg-gray-500/20'
              )}
            >
              {stat.trend === 'up' && (
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              )}
              {stat.trend === 'down' && (
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              )}
              {stat.trend === 'neutral' && (
                <div className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <span
              className={cn(
                'text-xs font-semibold',
                stat.trend === 'up' && 'text-emerald-400',
                stat.trend === 'down' && 'text-red-400',
                stat.trend === 'neutral' && 'text-gray-400'
              )}
            >
              {stat.trend === 'up' && '+'}
              {stat.change}%
            </span>
            <span className="text-xs text-white/50">vs last month</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
