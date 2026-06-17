mod commands;
mod sherlock;
mod history;
mod config;
mod sites;
mod download;

use commands::SearchState;
pub use commands::SherlockProcess;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SearchState {
            process: std::sync::Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::search_usernames,
            commands::cancel_search,
            commands::load_sites,
            commands::load_history,
            commands::delete_history,
            commands::clear_all_history,
            commands::load_config,
            commands::save_config,
            commands::check_sherlock,
            commands::check_sidecar_exists,
            commands::ensure_sidecar,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
