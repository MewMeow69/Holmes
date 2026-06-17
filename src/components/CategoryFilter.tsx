import { useState, useMemo, useRef, useEffect } from "react";
import type { SiteInfo, SearchResult } from "../lib/types";

interface Props {
  results: SearchResult[];
  sites: Record<string, SiteInfo>;
  selected: string[];
  onChange: (cats: string[]) => void;
  nsfwEnabled: boolean;
}

export default function CategoryFilter({ results, sites, selected, onChange, nsfwEnabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const siteNames = new Set(results.map(r => r.site));
    const cats = new Set<string>();
    for (const name of siteNames) {
      const info = sites[name];
      if (info) cats.add(info.category);
    }
    const sorted = [...cats].sort((a, b) => a.localeCompare(b));
    if (!nsfwEnabled) return sorted.filter(c => c !== "NSFW");
    return sorted;
  }, [results, sites, nsfwEnabled]);

  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => c.toLowerCase().includes(q));
  }, [categories, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="cat-filter" ref={ref}>
      <button className="cat-filter-trigger" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
        Category
        {selected.length > 0 && <span className="cat-filter-count">{selected.length}</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="cat-filter-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="cat-filter-search">
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="cat-filter-list">
            {filtered.map(cat => (
              <label key={cat} className="cat-filter-option">
                <input
                  type="checkbox"
                  checked={selected.includes(cat)}
                  onChange={() => {
                    if (selected.includes(cat)) {
                      onChange(selected.filter(c => c !== cat));
                    } else {
                      onChange([...selected, cat]);
                    }
                  }}
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button className="cat-filter-reset" onClick={(e) => { e.stopPropagation(); onChange([]); }}>
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
