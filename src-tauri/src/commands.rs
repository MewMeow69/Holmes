use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::sherlock;
use crate::history;
use crate::config;
use crate::download;
pub use crate::sherlock::SherlockProcess;
pub use crate::sites::SiteInfo;

pub struct SearchState {
    pub process: Mutex<Option<SherlockProcess>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    #[serde(default)]
    pub sites: Vec<String>,
    #[serde(default)]
    pub timeout: Option<u32>,
    #[serde(default)]
    pub proxy: Option<String>,
    #[serde(default)]
    pub use_tor: bool,
    #[serde(default)]
    pub include_nsfw: bool,
    #[serde(default)]
    pub expand_variants: bool,
    #[serde(default)]
    pub verbose: bool,
    #[serde(default)]
    pub print_all: bool,
    #[serde(default)]
    pub browse_found: bool,
    #[serde(default)]
    pub use_local_data: bool,
    #[serde(default)]
    pub custom_json: Option<String>,
    #[serde(default)]
    pub output_dir: Option<String>,
    #[serde(default)]
    pub output_format: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub username: String,
    pub site: String,
    pub url: String,
    pub found: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub timestamp: String,
    pub usernames: Vec<String>,
    pub found_count: usize,
    pub total_sites: usize,
    pub duration: f64,
    pub results: Vec<SearchResult>,
    pub options: SearchOptions,
    #[serde(default)]
    pub stopped: bool,
}

#[tauri::command]
pub async fn search_usernames(
    app: AppHandle,
    state: State<'_, SearchState>,
    usernames: Vec<String>,
    options: SearchOptions,
) -> Result<(), String> {
    if usernames.is_empty() {
        return Err("No usernames provided".into());
    }

    let proc = sherlock::start_search(app.clone(), usernames.clone(), options.clone())
        .map_err(|e| e.to_string())?;

    *state.process.lock().unwrap() = Some(proc);
    Ok(())
}

#[tauri::command]
pub async fn cancel_search(state: State<'_, SearchState>) -> Result<(), String> {
    let mut guard = state.process.lock().unwrap();
    if let Some(proc) = guard.take() {
        proc.cancel();
    }
    Ok(())
}

#[tauri::command]
pub async fn load_sites() -> Result<std::collections::HashMap<String, SiteInfo>, String> {
    crate::sites::load_sites().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_history() -> Result<Vec<HistoryEntry>, String> {
    history::load_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_history(id: String) -> Result<(), String> {
    history::delete_entry(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_all_history() -> Result<(), String> {
    history::clear_all().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_config() -> Result<serde_json::Value, String> {
    config::load_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_config(cfg: serde_json::Value) -> Result<(), String> {
    config::save_config(&cfg).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_sherlock() -> Result<bool, String> {
    Ok(crate::sites::check_sherlock_installed())
}

#[tauri::command]
pub async fn check_sidecar_exists() -> Result<bool, String> {
    Ok(download::sidecar_exists())
}

#[tauri::command]
pub async fn ensure_sidecar(app: AppHandle) -> Result<(), String> {
    let cancel = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    download::ensure_sidecar(app, cancel).map(|_| ())
}
