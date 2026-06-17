import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    win.isMaximized().then(setMaximized);
    const unlisten = win.onResized(async () => {
      setMaximized(await win.isMaximized());
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div data-tauri-drag-region className="title-bar">
      <span className="title-bar-text">Holmes</span>
      <div className="title-bar-controls">
        <button className="title-btn" aria-label="Minimize" onClick={() => getCurrentWindow().minimize()}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button className="title-btn" aria-label="Maximize" onClick={() => getCurrentWindow().toggleMaximize()}>
          {maximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="3" width="7" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="2" y1="3" x2="4" y2="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="9" y1="3" x2="11" y2="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          )}
        </button>
        <button className="title-btn title-btn-close" aria-label="Close" onClick={() => getCurrentWindow().close()}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
