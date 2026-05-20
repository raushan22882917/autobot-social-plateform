'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  cell: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  loading,
  emptyMessage = 'No data',
  rowKey,
}: {
  columns: Column<T>[];
  data: T[];
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowKey: (row: T) => string;
}) {
  if (loading) {
    return (
      <motion.div layout className="glass-card overflow-hidden">
        <div className="animate-pulse space-y-0">
          <div className="h-11 border-b border-white/10 bg-white/5" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 border-b border-white/5 bg-white/[0.02]" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (!data.length) {
    return (
      <motion.div layout className="glass-card px-4 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </motion.div>
    );
  }

  return (
    <motion.div layout className="glass-card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((col) => (
              <th key={col.key} className={cn('px-4 py-3 font-medium', col.className)}>
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                'border-b border-white/5 transition-colors hover:bg-white/[0.04]',
                onRowClick && 'cursor-pointer'
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 align-middle', col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
