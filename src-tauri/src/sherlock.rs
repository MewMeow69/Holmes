use regex::Regex;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio, Child};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

use crate::commands::{SearchOptions, SearchResult};
use crate::download;

pub struct SherlockProcess {
    child: Option<Child>,
    cancelled: Arc<AtomicBool>,
}

impl SherlockProcess {
    pub fn cancel(mut self) {
        self.cancelled.store(true, Ordering::SeqCst);
        if let Some(ref mut child) = self.child {
            let _ = child.kill();
        }
    }
}

pub fn start_search(
    app: AppHandle,
    usernames: Vec<String>,
    options: SearchOptions,
) -> Result<SherlockProcess, Box<dyn std::error::Error + Send + Sync>> {
    let cancelled = Arc::new(AtomicBool::new(false));
    let cancel_flag = cancelled.clone();

    let mut args: Vec<String> = Vec::new();
    args.push("--no-color".into());
    args.push("--print-all".into());
    for u in &usernames {
        args.push(u.clone());
    }
    for site in &options.sites {
        args.push("--site".into());
        args.push(site.clone());
    }
    if let Some(t) = options.timeout {
        args.push("--timeout".into());
        args.push(t.to_string());
    }
    if let Some(ref p) = options.proxy {
        if !p.is_empty() {
            args.push("--proxy".into());
            args.push(p.clone());
        }
    }
    if options.use_tor {
        args.push("--tor".into());
    }
    if options.include_nsfw {
        args.push("--nsfw".into());
    }
    if options.verbose {
        args.push("--verbose".into());
    }
    if options.print_all {
        args.push("--print-all".into());
    }
    if options.browse_found {
        args.push("--browse".into());
    }
    if options.use_local_data {
        args.push("--local".into());
    }
    if let Some(ref j) = options.custom_json {
        if !j.is_empty() {
            args.push("--json".into());
            args.push(j.clone());
        }
    }
    if let Some(ref out) = options.output_dir {
        if !out.is_empty() {
            if usernames.len() > 1 {
                args.push("--folderoutput".into());
            } else {
                args.push("--output".into());
            }
            args.push(out.clone());
        }
    }
    for fmt in &options.output_format {
        match fmt.as_str() {
            "csv" => args.push("--csv".into()),
            "xlsx" => args.push("--xlsx".into()),
            _ => {}
        }
    }

    let sidecar_exe = download::sidecar_path();
    let mut child = Command::new(&sidecar_exe)
        .args(&args)
        .current_dir(std::env::temp_dir())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar at {}: {e}", sidecar_exe.display()))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let usernames_clone = usernames.clone();
    let options_clone = options.clone();
    let app_clone = app.clone();
    let cancel_flag2 = cancel_flag.clone();

    // stdout parsing thread
    std::thread::spawn(move || {
        let start = Instant::now();
        let found_re = Regex::new(r"\[\+\]\s*(.+?):\s*(https?://\S+)").unwrap();
        let not_found_re = Regex::new(r"\[\-\]\s*(.+?):").unwrap();
        let current_user = usernames_clone.first().cloned().unwrap_or_default();
        let mut results: Vec<SearchResult> = Vec::new();

        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if cancel_flag.load(Ordering::SeqCst) {
                break;
            }
            let line = match line {
                Ok(l) => l,
                Err(_) => break,
            };
            let line = line.trim().to_string();
            if line.is_empty() {
                continue;
            }

            if let Some(caps) = found_re.captures(&line) {
                let site = caps[1].trim().to_string();
                let url = caps[2].trim().to_string();
                results.push(SearchResult {
                    username: current_user.clone(),
                    site: site.clone(),
                    url: url.clone(),
                    found: true,
                });
                let _ = app_clone.emit("search:found", serde_json::json!({
                    "username": current_user,
                    "site": site,
                    "url": url,
                }));
            } else if let Some(caps) = not_found_re.captures(&line) {
                let site = caps[1].trim().to_string();
                results.push(SearchResult {
                    username: current_user.clone(),
                    site: site.clone(),
                    url: String::new(),
                    found: false,
                });
                let _ = app_clone.emit("search:not_found", serde_json::json!({
                    "username": current_user,
                    "site": site,
                }));
            } else {
                if line.starts_with("[*]") || line.contains("Checking username") {
                    continue;
                }
                let _ = app_clone.emit("search:progress", serde_json::json!({
                    "text": line
                }));
            }
        }

        let duration = start.elapsed().as_secs_f64();
        let found = results.iter().filter(|r| r.found).count();
        let stopped = cancel_flag.load(Ordering::SeqCst);
        let _ = app_clone.emit("search:done", serde_json::json!({
            "results": results,
            "duration": duration,
            "found": found,
            "stopped": stopped,
        }));
        let _ = crate::history::add_entry(
            &usernames_clone, &results, duration, &options_clone, stopped,
        );
    });

    // stderr forwarding thread
    let app_clone2 = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if cancel_flag2.load(Ordering::SeqCst) {
                break;
            }
            if let Ok(text) = line {
                let _ = app_clone2.emit(
                    "search:progress",
                    serde_json::json!({ "text": text }),
                );
            }
        }
    });

    Ok(SherlockProcess {
        child: Some(child),
        cancelled,
    })
}
