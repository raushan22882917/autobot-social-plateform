'use client';


import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export function DataToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  totalCount,
  sourceCount,
  page,
  totalPages,
  onPageChange,
  extra,
  hideSearch,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  filters?: FilterOption[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onReset?: () => void;
  totalCount?: number;
  sourceCount?: number;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  extra?: ReactNode;
}) {
  return (
    <motion.div layout className="glass-card space-y-3 p-4">
      <motion.div layout className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!hideSearch && (
          <motion.div layout className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label="Search"
            />
          </motion.div>
        )}
        <motion.div layout className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <select
              key={f.key}
              value={filterValues[f.key] || 'all'}
              onChange={(e) => onFilterChange?.(f.key, e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              aria-label={f.label}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}
          {onReset && (
            <Button type="button" variant="ghost" size="sm" onClick={onReset} aria-label="Reset filters">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {extra}
        </motion.div>
      </motion.div>
      {(totalCount !== undefined || (page !== undefined && totalPages !== undefined)) && (
        <motion.div layout className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
          {totalCount !== undefined && (
            <span>
              {totalCount} {totalCount === 1 ? 'row' : 'rows'}
              {typeof sourceCount === 'number' && sourceCount !== totalCount
                ? ` (of ${sourceCount} loaded)`
                : ''}
            </span>
          )}
          {page !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange && (
            <motion.div layout className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
