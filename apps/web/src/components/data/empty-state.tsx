'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({
  title = 'No results',
  description,
  action,
  icon,
}: {
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}) {
  return (
    <motion.div layout className="glass-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
        {icon || <Inbox className="h-7 w-7 text-muted-foreground" />}
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
