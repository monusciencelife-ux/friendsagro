// Pure rules for investor requests and profit choices (reinvest / withdraw).
import { cell, investorLedger, money, type FinanceData, type FinanceRow } from "./accounting";

export const CHOICE_MARK = /\s*choice:(reinvest|withdraw)/;

export function parseData(r: FinanceRow): Record<string, unknown> {
  try { return JSON.parse(cell(r, "data") || "{}"); } catch { return {}; }
}

export function profitChoice(d: FinanceRow): "reinvest" | "withdraw" | null {
  if (cell(d, "status") === "reinvested") return "reinvest";
  const m = cell(d, "notes").match(CHOICE_MARK);
  return m ? (m[1] as "reinvest" | "withdraw") : null;
}

/** Profit rows of completed projects for an investor, with whether a choice is still open. */
export function investorNotifications(t: FinanceData, investorId: string) {
  const projects = t["projects"] ?? [];
  return (t["profit_distributions"] ?? [])
    .filter(d => cell(d, "investor_id") === investorId && ["credited", "adjustment", "reinvested"].includes(cell(d, "status")))
    .map(d => {
      const p = projects.find(p => cell(p, "id") === cell(d, "project_id"));
      const amount = money(cell(d, "profit_amount"));
      const choice = profitChoice(d);
      return { id: cell(d, "id"), projectId: cell(d, "project_id"), projectName: p ? cell(p, "name") : "", amount,
        date: cell(d, "resolved_at") || cell(d, "created_at"), choice,
        needsChoice: amount > 0 && cell(d, "status") === "credited" && !choice };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const reinvestLabel = (amount: number, investorName: string, projectName: string) =>
  `${money(amount)}_${investorName}_${projectName}`;

/** Amount an investor can still request to withdraw: available funds minus pending withdrawal requests. */
export function withdrawableAmount(t: FinanceData, investorId: string) {
  const pending = (t["requests"] ?? [])
    .filter(r => cell(r, "type") === "withdraw" && cell(r, "status") === "pending" && cell(r, "from_user_id") === investorId)
    .reduce((s, r) => s + Number(parseData(r)["amount"] ?? 0), 0);
  return money(investorLedger(t, investorId).available - pending);
}
