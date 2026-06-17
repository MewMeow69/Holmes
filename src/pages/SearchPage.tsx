import { useState, useEffect, useMemo } from "react";
import type { SearchOptions } from "../lib/types";
import { loadConfig } from "../lib/tauri";

interface Props {
  onSearch: (usernames: string[], options: SearchOptions) => void;
  searching: boolean;
}

const DEFAULT_OPTIONS: SearchOptions = {
  sites: [],
  timeout: 60,
  proxy: null,
  use_tor: false,
  include_nsfw: false,
  expand_variants: false,
  verbose: false,
  print_all: false,
  browse_found: false,
  use_local_data: false,
  custom_json: null,
  output_dir: null,
  output_format: ["txt"],
};

export default function SearchPage({ onSearch, searching }: Props) {
  const [username, setUsername] = useState("");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);

  useEffect(() => {
    loadConfig().then((cfg: Record<string, any>) => {
      setOptions((prev) => ({
        ...prev,
        timeout: cfg.timeout ?? prev.timeout,
        proxy: cfg.proxy || null,
        use_tor: cfg.use_tor ?? false,
        include_nsfw: cfg.include_nsfw ?? false,
        expand_variants: cfg.expand_variants ?? false,
        verbose: cfg.verbose ?? false,
        browse_found: cfg.browse_found ?? false,
        use_local_data: cfg.use_local_data ?? false,
        output_dir: cfg.output_dir || null,
        output_format: cfg.output_format ?? ["txt"],
      }));
    }).catch(() => {});
  }, []);

  const names = useMemo(() =>
    username
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    [username]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (names.length === 0) return;
    onSearch(names, options);
  };

  return (
    <div className="search-page">
      <div className="search-page-center">
        <h1 className="search-title">Holmes</h1>

        <form onSubmit={handleSubmit} className="search-form">
          <div className="glass-input-wrapper">
            <input
              type="text"
              className="glass-input"
              placeholder="Find Usernames"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              disabled={searching}
            />
            <button
              type="button"
              className={`variant-toggle${options.expand_variants ? " active" : ""}`}
              onClick={() => setOptions((o) => ({ ...o, expand_variants: !o.expand_variants }))}
            >
              More variants
            </button>
            <button
              type="button"
              className={`nsfw-toggle${options.include_nsfw ? " active" : ""}`}
              onClick={() => setOptions((o) => ({ ...o, include_nsfw: !o.include_nsfw }))}
            >
              NSFW
            </button>
          </div>

          <p className="input-hint">Separate multiple names with a comma</p>

          {names.length > 1 && (
            <div className="username-chips">
              {names.map((n) => (
                <span key={n} className="username-chip">{n}</span>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="gradient-button"
              disabled={searching || names.length === 0}
          >
            {searching ? (
              <>
                <span className="spinner" />
                Searching...
              </>
            ) : (
              "Start Search"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
