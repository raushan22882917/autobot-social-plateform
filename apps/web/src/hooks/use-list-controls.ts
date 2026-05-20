'use client';


import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface ListControlsOptions<T> {
  items: T[];
  searchKeys?: (keyof T | ((item: T) => string))[];
  filterFn?: (item: T, filters: Record<string, string>) => boolean;
  sortKeys?: Partial<Record<string, (a: T, b: T) => number>>;
  defaultSortKey?: string;
  defaultSortDir?: SortDir;
  pageSize?: number;
}

export function useListControls<T>({
  items,
  searchKeys = [],
  filterFn,
  sortKeys = {},
  defaultSortKey = '',
  defaultSortDir = 'desc',
  pageSize = 10,
}: ListControlsOptions<T>) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...items];
    const q = search.trim().toLowerCase();

    if (q && searchKeys.length) {
      list = list.filter((item) =>
        searchKeys.some((key) => {
          const val = typeof key === 'function' ? key(item) : String(item[key] ?? '');
          return val.toLowerCase().includes(q);
        })
      );
    }

    if (filterFn) {
      // Dropdowns display "all" before user touches them; treat missing keys as "all"
      const filtersWithDefaults = new Proxy(filters, {
        get(target, prop: string) {
          const v = target[prop];
          if (v === undefined || v === '') return 'all';
          return v;
        },
      }) as Record<string, string>;
      list = list.filter((item) => filterFn(item, filtersWithDefaults));
    }

    if (sortKey && sortKeys[sortKey]) {
      const cmp = sortKeys[sortKey]!;
      const mult = sortDir === 'asc' ? 1 : -1;
      list.sort((a, b) => cmp(a, b) * mult);
    }

    return list;
  }, [items, search, searchKeys, filterFn, filters, sortKey, sortDir, sortKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  function reset() {
    setSearch('');
    setFilters({});
    setSortKey(defaultSortKey);
    setSortDir(defaultSortDir);
    setPage(1);
  }

  return {
    search,
    setSearch,
    filters,
    setFilter,
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    setPage,
    totalPages,
    totalCount: filtered.length,
    filtered,
    paginated,
    reset,
  };
}
