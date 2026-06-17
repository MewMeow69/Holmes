use serde_json::Value;
use std::path::PathBuf;

fn data_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let dir = PathBuf::from(appdata).join("Holmes");
        let _ = std::fs::create_dir_all(&dir);
        dir
    } else {
        std::env::temp_dir()
    }
}

fn config_path() -> PathBuf {
    data_dir().join("sherlock_config.json")
}

fn defaults() -> Value {
    serde_json::json!({
        "timeout": 60,
        "proxy": "",
        "use_tor": false,
        "include_nsfw": false,
        "expand_variants": false,
        "output_format": ["txt"],
        "output_dir": "",
        "browse_found": false,
        "verbose": false,
        "use_local_data": false,
        "custom_json": "",
    })
}

pub fn load_config() -> Result<Value, Box<dyn std::error::Error>> {
    let path = config_path();
    let mut cfg = if path.exists() {
        let data = std::fs::read_to_string(&path)?;
        serde_json::from_str::<Value>(&data).unwrap_or(defaults())
    } else {
        defaults()
    };
    let d = defaults();
    if let (Value::Object(c), Value::Object(def)) = (&mut cfg, &d) {
        for (k, v) in def {
            c.entry(k.clone()).or_insert_with(|| v.clone());
        }
    }
    Ok(cfg)
}

pub fn save_config(cfg: &Value) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(cfg)?;
    std::fs::write(config_path(), json)?;
    Ok(())
}
