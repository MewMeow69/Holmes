import { useEffect, useState, useCallback } from "react";
import type { HistoryEntry } from "../lib/types";
import { loadHistory, deleteHistoryEntry, clearHistory, openUrl } from "../lib/tauri";
import GlassCard from "../components/GlassCard";
import StatusBadge from "../components/StatusBadge";

function formatDate(ts: string): string {
  const epochDay = ts.match(/epoch day (\d+)/);
  if (epochDay) {
    const d = new Date(parseInt(epochDay[1]) * 86400 * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const n = parseInt(ts);
  if (!isNaN(n)) {
    const d = new Date(n * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return ts;
}

interface Props {
  onRerun: (usernames: string[], options: any) => void;
  refreshTrigger: number;
  searching: boolean;
}

export default function HistoryPage({ onRerun, refreshTrigger, searching }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const handleClearAll = useCallback(async () => {
    if (!window.confirm("Delete all search history? This cannot be undone.")) return;
    await clearHistory();
    setEntries([]);
    setExpandedId(null);
  }, []);

  if (loading) {
    return (
      <div className="history-page">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-top-bar">
        <h2 className="history-title">Search History</h2>
        {entries.length > 0 && (
          <button className="clear-all-btn" onClick={handleClearAll}>
            Delete All
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">No past searches yet</div>
      ) : (
        <div className="history-list">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const foundResults = (entry.results ?? []).filter((r) => r.found).sort((a, b) => a.site.localeCompare(b.site));

            return (
              <GlassCard key={entry.id} className="history-card">
                <div
                  className="history-card-inner"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entry.id)
                  }
                >
                  <div className="history-card-top">
                    <span className="history-usernames">
                      {entry.usernames.join(", ")}
                    </span>
                    <span className="history-date">{formatDate(entry.timestamp)}</span>
                  </div>
                  <div className="history-card-stats">
                    Found {entry.found_count} / {entry.total_sites} sites
                    {" · "}
                    {entry.duration < 60
                      ? `${entry.duration.toFixed(1)}s`
                      : `${Math.floor(entry.duration / 60)}m ${Math.floor(entry.duration % 60)}s`}
                  </div>
                  <div className="history-badges">
                    {entry.stopped && <span className="badge badge-stopped">Stopped</span>}
                    {entry.options?.include_nsfw && <span className="badge badge-nsfw">NSFW</span>}
                  </div>
                  <div className="history-card-actions">
                    <div className="history-actions-left">
                      <button
                        className={`rerun-button${searching ? " disabled" : ""}`}
                        disabled={searching}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!searching) onRerun(entry.usernames, entry.options);
                        }}
                      >
                        Re-run
                      </button>
                      <button
                        className="delete-button"
                        disabled={searching}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await deleteHistoryEntry(entry.id);
                          setEntries((prev) => prev.filter((p) => p.id !== entry.id));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="history-expanded">
                    <div className="history-expanded-list">
                      {foundResults.map((r, i) => (
                        <div
                          key={i}
                          className="history-result-row"
                          onClick={() => r.url && openUrl(r.url)}
                          title={r.url ? `Open ${r.url}` : undefined}
                        >
                          <StatusBadge found={true} />
                          <span className="history-result-site">{r.site}</span>
                          {r.url && (
                            <span className="history-result-url">{r.url}</span>
                          )}
                        </div>
                      ))}
                      {foundResults.length === 0 && (
                        <div className="empty-state" style={{ padding: "16px" }}>
                          No found results
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
