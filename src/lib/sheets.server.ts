// Server-only Google Sheets data layer via the Lovable connector gateway.
// Never import this file from client code.

const SPREADSHEET_ID = "1vwNR49HQfmv5tMeYiTWXm7pjVgviHmn_rblmx9LBCME";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

export type Row = Record<string, string>;

export const TABS = {
  profiles: ["id", "name", "location", "phone", "photo_url", "created_at", "updated_at", "user_id"],
  investments: ["id", "investor_id", "amount", "date", "created_at"],
  cashouts: ["id", "investor_id", "amount", "date", "note", "created_at"],
  requests: ["id", "type", "status", "from_user_id", "to_user_id", "project_id", "data", "created_at", "resolved_at", "resolved_by"],
  projects: ["id", "name", "estimated_investment", "estimated_profit", "actual_profit", "status", "images", "started_at", "completed_at", "created_at", "updated_at", "notes", "manager_id", "description"],
  project_steps: ["id", "project_id", "reason", "amount", "proof_images", "date", "created_at", "notes", "updated_at"],
  project_sales: ["id", "project_id", "name", "amount", "date", "created_at", "updated_at"],
  profit_distributions: ["id", "project_id", "investor_id", "snapshot_id", "status", "profit_amount", "locked_amount", "notes", "resolved_at", "created_at"],
  percentage_snapshots: ["id", "project_id", "investor_id", "percentage", "locked_amount", "created_at"],
  bill_causes: ["id", "name", "created_at"],
  chat_messages: ["id", "project_id", "sender_id", "message", "created_at"],
  chat_read_receipts: ["id", "message_id", "reader_id", "read_at"],
} as const;

export type TabName = keyof typeof TABS;

function gatewayKeys() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Google Sheets connection is not configured");
  }
  return { lovableKey, connectionKey };
}

async function sheetsApi(path: string, init?: RequestInit): Promise<any> {
  const { lovableKey, connectionKey } = gatewayKeys();
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Sheets API failed [${res.status}]: ${body}`);
    throw new Error(`Provider request failed [${res.status}]: ${body}`);
  }
  return res.json();
}

function colLetter(index: number): string {
  // 0 -> A, 1 -> B, ...
  return String.fromCharCode(65 + index);
}

function rowsToObjects(values: string[][] | undefined): Row[] {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values
    .slice(1)
    .filter((r) => r.some((c) => c !== "" && c != null))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

// Small cache to respect the 60 req/min Sheets quota.
const cache = new Map<string, { at: number; data: Row[] }>();
const CACHE_TTL_MS = 8_000;

export function invalidateTab(tab: TabName) {
  cache.delete(tab);
}

export function invalidateAll() {
  cache.clear();
}

export async function readTab(tab: TabName, fresh = false): Promise<Row[]> {
  const hit = cache.get(tab);
  if (!fresh && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const data = await sheetsApi(`/spreadsheets/${SPREADSHEET_ID}/values/${tab}!A1:Z10000`);
  const rows = rowsToObjects(data.values);
  cache.set(tab, { at: Date.now(), data: rows });
  return rows;
}

export async function readTabs<T extends TabName>(tabs: T[], fresh = false): Promise<Record<T, Row[]>> {
  const missing = tabs.filter((t) => {
    const hit = cache.get(t);
    return fresh || !hit || Date.now() - hit.at >= CACHE_TTL_MS;
  });
  if (missing.length > 0) {
    const qs = missing.map((t) => `ranges=${encodeURIComponent(`${t}!A1:Z10000`)}`).join("&");
    const data = await sheetsApi(`/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${qs}`);
    const ranges: any[] = data.valueRanges ?? [];
    ranges.forEach((vr, i) => {
      cache.set(missing[i], { at: Date.now(), data: rowsToObjects(vr.values) });
    });
  }
  const out = {} as Record<T, Row[]>;
  for (const t of tabs) out[t] = cache.get(t)?.data ?? [];
  return out;
}

export async function appendRow(tab: TabName, row: Row): Promise<void> {
  const headers = TABS[tab] as readonly string[];
  const values = [headers.map((h) => row[h] ?? "")];
  await sheetsApi(
    `/spreadsheets/${SPREADSHEET_ID}/values/${tab}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ majorDimension: "ROWS", values }) },
  );
  invalidateTab(tab);
}

export async function updateRow(tab: TabName, id: string, patch: Row): Promise<void> {
  const headers = TABS[tab] as readonly string[];
  const data = await sheetsApi(`/spreadsheets/${SPREADSHEET_ID}/values/${tab}!A1:Z10000`);
  const values: string[][] = data.values ?? [];
  const rowIndex = values.findIndex((r, i) => i > 0 && r[0] === id);
  if (rowIndex === -1) throw new Error(`Row not found in ${tab}: ${id}`);
  const current = Object.fromEntries(headers.map((h, i) => [h, values[rowIndex][i] ?? ""]));
  const merged = { ...current, ...patch };
  const endCol = colLetter(headers.length - 1);
  await sheetsApi(
    `/spreadsheets/${SPREADSHEET_ID}/values/${tab}!A${rowIndex + 1}:${endCol}${rowIndex + 1}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ majorDimension: "ROWS", values: [headers.map((h) => merged[h] ?? "")] }) },
  );
  invalidateTab(tab);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
