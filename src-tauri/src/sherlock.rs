use regex::Regex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

use crate::commands::{SearchOptions, SearchResult};

pub struct SherlockProcess {
    child: Option<tauri_plugin_shell::process::CommandChild>,
    cancelled: Arc<AtomicBool>,
}

impl SherlockProcess {
    pub fn cancel(mut self) {
        self.cancelled.store(true, Ordering::SeqCst);
        if let Some(child) = self.child.take() {
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
    if options.use_tor { args.push("--tor".into()); }
    if options.include_nsfw { args.push("--nsfw".into()); }
    if options.verbose { args.push("--verbose".into()); }
    if options.print_all { args.push("--print-all".into()); }
    if options.browse_found { args.push("--browse".into()); }
    if options.use_local_data { args.push("--local".into()); }
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

    let sidecar = app.shell().sidecar("sherlock-cli")
        .map_err(|e| format!("{e}"))?;
    let sidecar = sidecar.current_dir(std::env::temp_dir());
    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let sidecar = sidecar.args(&arg_refs);

    let (mut rx, child) = sidecar.spawn()
        .map_err(|e| format!("{e}"))?;

    let usernames_clone = usernames.clone();
    let options_clone = options.clone();
    let app_clone = app.clone();

    tauri::async_runtime::spawn(async move {
        let start = Instant::now();
        let found_re = Regex::new(r"\[\+\]\s*(.+?):\s*(https?://\S+)").unwrap();
        let not_found_re = Regex::new(r"\[\-\]\s*(.+?):").unwrap();
        let current_user = usernames_clone.first().cloned().unwrap_or_default();
        let mut results: Vec<SearchResult> = Vec::new();
        let mut line_buffer = String::new();

        'event_loop: loop {
            if cancel_flag.load(Ordering::SeqCst) {
                break;
            }
            let event = match rx.recv().await {
                Some(e) => e,
                None => break,
            };
            match event {
                CommandEvent::Stdout(bytes) => {
                    use std::fmt::Write;
                    let _ = write!(line_buffer, "{}", String::from_utf8_lossy(&bytes));
                    while let Some(pos) = line_buffer.find('\n') {
                        let line = line_buffer[..pos].trim().to_string();
                        line_buffer = line_buffer[pos + 1..].to_string();
                        if line.is_empty() { continue; }

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
                }
                CommandEvent::Stderr(bytes) => {
                    let text = String::from_utf8_lossy(&bytes).to_string();
                    let _ = app_clone.emit("search:progress", serde_json::json!({ "text": text }));
                }
                CommandEvent::Terminated(_) => break 'event_loop,
                _ => {}
            }
        }

        // Flush remaining buffer after sidecar terminates
        if !cancel_flag.load(Ordering::SeqCst) {
            let leftover = line_buffer.trim().to_string();
            if !leftover.is_empty() {
                if let Some(caps) = found_re.captures(&leftover) {
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
                } else if let Some(caps) = not_found_re.captures(&leftover) {
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
                }
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
        let _ = crate::history::add_entry(&usernames_clone, &results, duration, &options_clone, stopped);
    });

    Ok(SherlockProcess {
        child: Some(child),
        cancelled,
    })
}
