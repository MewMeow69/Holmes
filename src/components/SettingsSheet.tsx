import { useState, useEffect } from "react";
import { loadConfig, saveConfig, pickFolder } from "../lib/tauri";

interface Props {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = "export" | "data";

export default function SettingsSheet({ open, onClose }: Props) {
  const [tab, setTab] = useState<SettingsTab>("export");
  const [cfg, setCfg] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      loadConfig().then((c) => {
        setCfg(c);
        setLoaded(true);
      });
    }
  }, [open, loaded]);

  if (!open) return null;

  const update = async (key: string, value: any) => {
    const next = { ...cfg, [key]: value };
    setCfg(next);
    await saveConfig(next);
  };

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "export", label: "Export" },
    { key: "data", label: "Data" },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`settings-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {tab === "export" && (
            <div className="settings-group">
              <label className="setting-row">
                <span>Output format</span>
                <div className="format-toggles">
                  {["txt", "csv", "xlsx"].map((f) => (
                    <label key={f} className="format-label">
                      <input
                        type="checkbox"
                        checked={(cfg.output_format ?? ["txt"]).includes(f)}
                        onChange={(e) => {
                          const fmt = cfg.output_format ?? ["txt"];
                          const next = e.target.checked
                            ? [...fmt, f]
                            : fmt.filter((x: string) => x !== f);
                          update("output_format", next);
                        }}
                      />
                      {f.toUpperCase()}
                    </label>
                  ))}
                </div>
              </label>

              <label className="setting-row">
                <span>Output directory</span>
                <div className="output-dir-row">
                  <input
                    type="text"
                    className="glass-input setting-input"
                    placeholder="No output directory set"
                    value={cfg.output_dir ?? ""}
                    readOnly
                    onClick={async () => {
                      const dir = await pickFolder();
                      if (dir) update("output_dir", dir);
                    }}
                  />
                  <button
                    className="browse-btn"
                    onClick={async () => {
                      const dir = await pickFolder();
                      if (dir) update("output_dir", dir);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  </button>
                </div>
              </label>

              <label className="setting-row">
                <span>Open found profiles in browser</span>
                <input
                  type="checkbox"
                  checked={cfg.browse_found ?? false}
                  onChange={(e) => update("browse_found", e.target.checked)}
                />
              </label>
            </div>
          )}

          {tab === "data" && (
            <div className="settings-group">
              <label className="setting-row">
                <span>Timeout (seconds)</span>
                <input
                  type="number"
                  className="glass-input setting-input"
                  min={5}
                  max={120}
                  value={cfg.timeout ?? 60}
                  onChange={(e) => update("timeout", parseInt(e.target.value) || 60)}
                />
              </label>
              <label className="setting-row">
                <span>Proxy</span>
                <input
                  type="text"
                  className="glass-input setting-input"
                  placeholder="socks5://127.0.0.1:1080"
                  value={cfg.proxy ?? ""}
                  onChange={(e) => update("proxy", e.target.value)}
                />
              </label>
              <label className="setting-row">
                <span>Route through Tor</span>
                <input
                  type="checkbox"
                  checked={cfg.use_tor ?? false}
                  onChange={(e) => update("use_tor", e.target.checked)}
                />
              </label>
              <label className="setting-row">
                <span>Use local data only</span>
                <input
                  type="checkbox"
                  checked={cfg.use_local_data ?? false}
                  onChange={(e) => update("use_local_data", e.target.checked)}
                />
              </label>
              <label className="setting-row">
                <span>Verbose logging</span>
                <input
                  type="checkbox"
                  checked={cfg.verbose ?? false}
                  onChange={(e) => update("verbose", e.target.checked)}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
