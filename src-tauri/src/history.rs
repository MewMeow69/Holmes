use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::commands::{HistoryEntry, SearchOptions, SearchResult};

fn data_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let dir = PathBuf::from(appdata).join("Holmes");
        let _ = std::fs::create_dir_all(&dir);
        dir
    } else {
        std::env::temp_dir()
    }
}

fn history_path() -> PathBuf {
    data_dir().join("sherlock_history.json")
}

fn timestamp() -> (String, String) {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let id = format!("{:x}", secs);
    let ts = secs.to_string();
    (id, ts)
}

pub fn load_history() -> Result<Vec<HistoryEntry>, Box<dyn std::error::Error>> {
    let path = history_path();
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = std::fs::read_to_string(&path)?;
    let entries: Vec<HistoryEntry> = serde_json::from_str(&data).unwrap_or_default();
    Ok(entries)
}

pub fn add_entry(
    usernames: &[String],
    results: &[SearchResult],
    duration: f64,
    options: &SearchOptions,
    stopped: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let (id, ts) = timestamp();
    let entry = HistoryEntry {
        id,
        timestamp: ts,
        usernames: usernames.to_vec(),
        found_count: results.iter().filter(|r| r.found).count(),
        total_sites: results.len(),
        duration,
        results: results.to_vec(),
        options: options.clone(),
        stopped,
    };

    let mut history = load_history().unwrap_or_default();
    history.retain(|h| h.id != entry.id);
    history.insert(0, entry);
    history.truncate(100);

    let json = serde_json::to_string_pretty(&history)?;
    std::fs::write(history_path(), json)?;
    Ok(())
}

pub fn delete_entry(id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut history = load_history()?;
    history.retain(|h| h.id != id);
    let json = serde_json::to_string_pretty(&history)?;
    std::fs::write(history_path(), json)?;
    Ok(())
}

pub fn clear_all() -> Result<(), Box<dyn std::error::Error>> {
    std::fs::write(history_path(), "[]")?;
    Ok(())
}
