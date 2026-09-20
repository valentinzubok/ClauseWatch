import { CONTRACT_ADDRESS } from "./config";
import { type Address, parseJson, readContract, writeAndWait } from "./genlayer";

export type WatchRow = {
  watch_id: string;
  url: string;
  label: string;
  criteria: string;
  created_by: string;
  status: string;
  baseline_hash: string;
  baseline_preview: string;
  baseline_version: number;
  pending_hash: string;
  pending_preview: string;
  checks: number;
  changes: number;
  material_changes: number;
  last_result: string;
  last_alert_id: string;
};

export type AlertRow = {
  alert_id: string;
  watch_id: string;
  label: string;
  url: string;
  previous_hash: string;
  current_hash: string;
  baseline_version: number;
  material: boolean;
  preview: string;
  raised_by: string;
};

export type Stats = {
  watches: number;
  active: number;
  checks: number;
  alerts: number;
  material_alerts: number;
  cosmetic_alerts: number;
};

export async function listIds(): Promise<string[]> {
  const raw = await readContract<string>(CONTRACT_ADDRESS, "list_ids", []);
  return parseJson<string[]>(raw, []);
}

export async function getWatch(id: string): Promise<WatchRow | null> {
  const raw = await readContract<string>(CONTRACT_ADDRESS, "get_watch", [id]);
  const parsed = parseJson<WatchRow & { error?: string }>(raw, {} as WatchRow);
  return parsed.watch_id ? parsed : null;
}

export async function listAlerts(watchId = ""): Promise<AlertRow[]> {
  const raw = await readContract<string>(CONTRACT_ADDRESS, "list_alerts", [watchId]);
  return parseJson<AlertRow[]>(raw, []);
}

export async function getStats(): Promise<Stats | null> {
  const raw = await readContract<string>(CONTRACT_ADDRESS, "get_stats", []);
  return parseJson<Stats | null>(raw, null);
}

export async function getOwner(): Promise<string> {
  return (await readContract<string>(CONTRACT_ADDRESS, "get_owner", [])) || "";
}

export async function getCriteriaTemplate(): Promise<string> {
  return (await readContract<string>(CONTRACT_ADDRESS, "get_criteria_template", [])) || "";
}

export async function registerWatch(
  account: Address,
  provider: unknown,
  watchId: string,
  url: string,
  label: string,
  criteria: string,
) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "register_watch", [
    watchId,
    url,
    label,
    criteria,
  ]);
}

export async function check(account: Address, provider: unknown, watchId: string) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "check", [watchId]);
}

export async function acknowledge(account: Address, provider: unknown, watchId: string) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "acknowledge", [watchId]);
}

export async function setStatus(
  account: Address,
  provider: unknown,
  watchId: string,
  status: string,
) {
  return writeAndWait(account, provider, CONTRACT_ADDRESS, "set_status", [watchId, status]);
}
