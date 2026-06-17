import { useState, useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import type { Page, SearchResult, SearchOptions, Theme } from "./lib/types";
import { searchUsernames, cancelSearch, checkSidecarExists, ensureSidecar } from "./lib/tauri";
import SearchPage from "./pages/SearchPage";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import BottomNav from "./components/BottomNav";
import SettingsSheet from "./components/SettingsSheet";
import TitleBar from "./components/TitleBar";
import SidecarDownloader from "./components/SidecarDownloader";

function getSavedTheme(): Theme {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved;
  return "light";
}

export default function App() {
  const [page, setPage] = useState<Page>("search");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentUsernames, setCurrentUsernames] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [progress, setProgress] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const [sidecarReady, setSidecarReady] = useState(false);
  const [checkingSidecar, setCheckingSidecar] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    checkSidecarExists()
      .then((exists) => {
        if (exists) {
          setSidecarReady(true);
        } else {
          ensureSidecar().catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setCheckingSidecar(false));
  }, []);

  useEffect(() => {
    let raf: number;
    const onMove = (e: MouseEvent) => {
      raf = requestAnimationFrame(() => {
        setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const handleSearch = useCallback(async (usernames: string[], opts: SearchOptions) => {
    setSearching(true);
    setResults([]);
    setDuration(null);
    setProgress("Starting search...");
    setCurrentUsernames(usernames);
    setPage("search");

    let unlistenFns: (() => void)[] = [];
    const cleanup = () => {
      for (const u of unlistenFns) u();
      unlistenFns = [];
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;

    unlistenFns = await Promise.all([
      listen<{ username: string; site: string; url: string }>("search:found", (e) => {
        setResults((prev) => [
          ...prev,
          { username: e.payload.username, site: e.payload.site, url: e.payload.url, found: true },
        ]);
      }),
      listen<{ username: string; site: string }>("search:not_found", (e) => {
        setResults((prev) => [
          ...prev,
          { username: e.payload.username, site: e.payload.site, url: "", found: false },
        ]);
      }),
      listen<{ text: string }>("search:progress", (e) => {
        setProgress(e.payload.text);
      }),
      listen<{ results: SearchResult[]; duration: number; found: number; stopped?: boolean }>("search:done", (e) => {
        setResults(e.payload.results);
        setDuration(e.payload.duration);
        setSearching(false);
        setHistoryRefresh((n) => n + 1);
        cleanup();
      }),
    ]);

    try {
      await searchUsernames(usernames, opts);
    } catch (err) {
      setSearching(false);
      setProgress(`Error: ${err}`);
      cleanup();
    }
  }, []);

  const handleCancel = useCallback(async () => {
    await cancelSearch();
  }, []);

  const handleRerun = useCallback(
    async (usernames: string[], options: SearchOptions) => {
      setPage("search");
      await handleSearch(usernames, options);
    },
    [handleSearch]
  );

  return (
    <div
      className="app-shell"
      style={{ "--mouse-x": mouse.x, "--mouse-y": mouse.y } as React.CSSProperties}
    >
      {checkingSidecar ? (
        <div className="empty-state" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading...
        </div>
      ) : !sidecarReady ? (
        <SidecarDownloader onDone={() => setSidecarReady(true)} />
      ) : (
        <>
          <TitleBar />
          <main className="app-content">
        {page === "search" && !searching && results.length === 0 && (
          <SearchPage onSearch={handleSearch} searching={false} />
        )}
        {page === "search" && (searching || results.length > 0) && (
          <ResultsPage
            results={results}
            usernames={currentUsernames}
            searching={searching}
            progress={progress}
            duration={duration}
            onCancel={handleCancel}
            onBack={() => {
              setResults([]);
              setSearching(false);
            }}
          />
        )}
        {page === "history" && (
          <HistoryPage
            refreshTrigger={historyRefresh}
            onRerun={handleRerun}
            searching={searching}
          />
        )}
      </main>

      <BottomNav
        active={page}
        theme={theme}
        onNavigate={setPage}
        onSettings={() => setSettingsOpen(true)}
        onToggleTheme={toggleTheme}
      />

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </>
      )}
    </div>
  );
}
