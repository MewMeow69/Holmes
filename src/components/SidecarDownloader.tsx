import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

interface Props {
  onDone: () => void;
}

export default function SidecarDownloader({ onDone }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Preparing...");

  useEffect(() => {
    const unlisten = Promise.all([
      listen<{ downloaded: number; total: number }>("sidecar:progress", (e) => {
        setStatus("Downloading search engine...");
        if (e.payload.total > 0) {
          setProgress(Math.round((e.payload.downloaded / e.payload.total) * 100));
        }
      }),
      listen("sidecar:done", () => {
        setStatus("Done");
        onDone();
      }),
      listen<{ state: string }>("sidecar:status", (e) => {
        if (e.payload.state === "downloading") {
          setStatus("Connecting...");
        }
      }),
    ]);

    return () => {
      unlisten.then(([u1, u2, u3]) => {
        u1(); u2(); u3();
      });
    };
  }, [onDone]);

  return (
    <div className="downloader-overlay">
      <div className="downloader-card">
        <h2 className="downloader-title">Holmes</h2>
        <p className="downloader-subtitle">Setting up for first use</p>
        <div className="downloader-bar-track">
          <div
            className="downloader-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="downloader-text">
          {status}
          {progress > 0 && ` (${progress}%)`}
        </p>
        <p className="downloader-hint">One-time download ~110 MB</p>
      </div>
    </div>
  );
}
