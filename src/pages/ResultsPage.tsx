import { useState, useMemo, useEffect } from "react";
import type { SearchResult, ResultFilter, SiteInfo } from "../lib/types";
import { openUrl, loadSites } from "../lib/tauri";
import GlassCard from "../components/GlassCard";
import StatusBadge from "../components/StatusBadge";
import CategoryFilter from "../components/CategoryFilter";
import UsernameFilter from "../components/UsernameFilter";

interface Props {
  results: SearchResult[];
  usernames: string[];
  searching: boolean;
  progress: string;
  duration: number | null;
  onCancel: () => void;
  onBack: () => void;
}

export default function ResultsPage({
  results,
  usernames,
  searching,
  progress,
  duration,
  onCancel,
  onBack,
}: Props) {
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [sites, setSites] = useState<Record<string, SiteInfo>>({});
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);

  useEffect(() => { loadSites().then(setSites).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    let f = results;
    if (filter === "found") f = f.filter((r) => r.found);
    if (filter === "not_found") f = f.filter((r) => !r.found);
    if (selectedUsernames.length > 0) {
      f = f.filter(r => selectedUsernames.includes(r.username));
    }
    if (selectedCats.length > 0 && f.length > 0) {
      f = f.filter(r => {
        const info = sites[r.site];
        return info && selectedCats.includes(info.category);
      });
    }
    return f.sort((a, b) => a.site.localeCompare(b.site));
  }, [results, filter, selectedCats, selectedUsernames, sites]);

  const found = results.filter((r) => r.found).length;
  const notFound = results.length - found;

  const filters: { key: ResultFilter; label: string }[] = [
    { key: "all", label: `All (${results.length})` },
    { key: "found", label: `Found (${found})` },
    { key: "not_found", label: `Not Found (${notFound})` },
  ];

  return (
    <div className="results-page">
      <div className="results-header">
        <h2 className="results-title">
          {searching ? "Searching..." : `Results for ${usernames.join(", ")}`}
        </h2>
        <div className="results-stats">
          <span className="stat-found">{found} found</span>
          <span className="stat-missing">{notFound} not found</span>
          {duration !== null && (
            <span className="stat-duration">
              {duration < 60
                ? `${duration.toFixed(1)}s`
                : `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`}
            </span>
          )}
        </div>
        {searching ? (
          <button className="stop-button" onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="3" />
            </svg>
            Stop Search
          </button>
        ) : (
          <button className="glass-back-button" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            New Search
          </button>
        )}
      </div>

      {searching && (
        <div className="progress-bar">
          <div className="progress-track">
            <div className="progress-fill" />
          </div>
        </div>
      )}

      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-pill ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <div className="filter-bar-right">
          {usernames.length > 1 && (
            <UsernameFilter
              usernames={usernames}
              selected={selectedUsernames}
              onChange={setSelectedUsernames}
            />
          )}
          <CategoryFilter
            results={results}
            sites={sites}
            selected={selectedCats}
            onChange={setSelectedCats}
            nsfwEnabled={false}
          />
        </div>
      </div>

      <div className="results-grid">
        {filtered.map((r, i) => (
          <GlassCard
            key={`${r.site}-${i}`}
            className={`result-card${r.found ? " result-clickable" : ""}`}
          >
            <div
              className="result-row"
              onClick={() => {
                if (r.found && r.url) openUrl(r.url);
              }}
              title={r.found ? `Open ${r.url}` : undefined}
            >
              <StatusBadge found={r.found} />
              <span className="result-site">{r.site}</span>
              {r.found && r.url && (
                <span className="result-url">{r.url}</span>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {!searching && results.length === 0 && (
        <div className="empty-state">No results yet</div>
      )}
    </div>
  );
}
