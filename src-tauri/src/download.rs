use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

const SIDECAR_URL: &str =
    "https://raw.githubusercontent.com/MewMeow69/Holmes/main/src-tauri/binaries/sherlock-cli-x86_64-pc-windows-msvc.exe";

fn sidecar_dir() -> PathBuf {
    PathBuf::from(std::env::var("APPDATA").unwrap_or_default()).join("Holmes")
}

pub fn sidecar_path() -> PathBuf {
    sidecar_dir().join("sherlock-cli.exe")
}

pub fn sidecar_exists() -> bool {
    sidecar_path().exists()
}

pub fn ensure_sidecar(app: AppHandle, cancel: Arc<AtomicBool>) -> Result<PathBuf, String> {
    let dir = sidecar_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {e}"))?;
    let path = sidecar_path();

    if path.exists() {
        return Ok(path);
    }

    let _ = app.emit("sidecar:status", serde_json::json!({ "state": "downloading" }));

    let resp = ureq::get(SIDECAR_URL)
        .call()
        .map_err(|e| format!("Download failed: {e}"))?;

    let total: u64 = resp
        .header("Content-Length")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);

    let mut reader = resp.into_reader();
    let mut file = fs::File::create(&path).map_err(|e| format!("File error: {e}"))?;
    let mut buf = [0u8; 65536];
    let mut downloaded: u64 = 0;

    loop {
        if cancel.load(Ordering::SeqCst) {
            let _ = fs::remove_file(&path);
            return Err("Download cancelled".into());
        }
        let n = reader
            .read(&mut buf)
            .map_err(|e| format!("Read error: {e}"))?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n])
            .map_err(|e| format!("Write error: {e}"))?;
        downloaded += n as u64;
        let _ = app.emit(
            "sidecar:progress",
            serde_json::json!({ "downloaded": downloaded, "total": total }),
        );
    }

    file.flush().map_err(|e| format!("Flush error: {e}"))?;
    let _ = app.emit("sidecar:done", ());
    Ok(path)
}
