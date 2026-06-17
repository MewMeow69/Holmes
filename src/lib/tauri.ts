import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { SearchOptions, SearchResult, SiteInfo, HistoryEntry } from "./types";

export async function searchUsernames(
  usernames: string[],
  options: SearchOptions
): Promise<void> {
  await invoke("search_usernames", { usernames, options });
}

export async function cancelSearch(): Promise<void> {
  await invoke("cancel_search");
}

export async function loadSites(): Promise<Record<string, SiteInfo>> {
  return invoke("load_sites");
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  return invoke("load_history");
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  await invoke("delete_history", { id });
}

export async function loadConfig(): Promise<Record<string, any>> {
  return invoke("load_config");
}

export async function saveConfig(cfg: Record<string, any>): Promise<void> {
  await invoke("save_config", { cfg });
}

export async function checkSherlock(): Promise<boolean> {
  return invoke("check_sherlock");
}

export async function openUrl(url: string): Promise<void> {
  await open(url);
}

export async function clearHistory(): Promise<void> {
  await invoke("clear_all_history");
}

export async function pickFolder(): Promise<string | null> {
  const selected = await openDialog({ directory: true, multiple: false, title: "Select output folder" });
  return selected ?? null;
}
