use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteInfo {
    pub url: String,
    pub category: String,
}

const CATEGORY_MAP: &[(&str, &str)] = &[
    ("github", "Dev"), ("gitlab", "Dev"), ("bitbucket", "Dev"), ("stackoverflow", "Dev"),
    ("codepen", "Dev"), ("replit", "Dev"), ("leetcode", "Dev"), ("hackerrank", "Dev"),
    ("twitter", "Social"), ("instagram", "Social"), ("facebook", "Social"),
    ("reddit", "Social"), ("tiktok", "Social"), ("snapchat", "Social"),
    ("pinterest", "Social"), ("tumblr", "Social"), ("flickr", "Social"),
    ("youtube", "Video"), ("vimeo", "Video"), ("twitch", "Video"), ("dailymotion", "Video"),
    ("spotify", "Music"), ("soundcloud", "Music"), ("lastfm", "Music"),
    ("linkedin", "Professional"), ("xing", "Professional"),
    ("patreon", "Funding"), ("buymeacoffee", "Funding"), ("ko-fi", "Funding"),
    ("paypal", "Finance"), ("cashapp", "Finance"), ("venmo", "Finance"),
    ("medium", "Blog"), ("blogger", "Blog"), ("wordpress", "Blog"),
    ("wikipedia", "Wiki"), ("quora", "Q&A"),
    ("telegram", "Messaging"), ("discord", "Messaging"), ("whatsapp", "Messaging"),
    ("steam", "Gaming"), ("roblox", "Gaming"), ("chess", "Gaming"),
    ("etsy", "Shopping"), ("ebay", "Shopping"), ("amazon", "Shopping"),
];

fn categorize_site(_name: &str, url_main: &str) -> String {
    let url_lower = url_main.to_lowercase();
    for (key, cat) in CATEGORY_MAP {
        if url_lower.contains(key) {
            return cat.to_string();
        }
    }
    "Other".to_string()
}

fn find_sherlock_data() -> Option<std::path::PathBuf> {
    // Search Python site-packages for sherlock_project/resources/data.json
    let output = Command::new("python")
        .args(["-c", "import sherlock_project, os; print(os.path.dirname(sherlock_project.__file__))"])
        .output()
        .ok()?;
    let dir = String::from_utf8(output.stdout).ok()?;
    let path = std::path::PathBuf::from(dir.trim()).join("resources").join("data.json");
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

pub fn load_sites() -> Result<HashMap<String, SiteInfo>, Box<dyn std::error::Error>> {
    let path = find_sherlock_data().ok_or("Could not find sherlock data.json")?;
    let data = std::fs::read_to_string(&path)?;
    let raw: serde_json::Value = serde_json::from_str(&data)?;

    let mut sites = HashMap::new();
    if let Some(obj) = raw.as_object() {
        for (name, info) in obj {
            if let Some(info_obj) = info.as_object() {
                let url_main = info_obj.get("urlMain").and_then(|v| v.as_str()).unwrap_or("");
                let category = categorize_site(name, url_main);
                sites.insert(name.clone(), SiteInfo {
                    url: url_main.to_string(),
                    category,
                });
            }
        }
    }

    Ok(sites)
}

pub fn check_sherlock_installed() -> bool {
    Command::new("python")
        .args(["-m", "sherlock_project", "--version"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
