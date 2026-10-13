// Bengali formatting helpers — numbers, currency, dates.

const bnNumber = new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 });
const bnNumber2 = new Intl.NumberFormat("bn-BD", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function bnNum(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(n)) return "০";
  return bnNumber.format(n);
}

export function bnTaka(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(n)) return "৳০";
  return `৳${bnNumber2.format(n)}`;
}

export function bnPercent(value: number): string {
  return `${bnNumber2.format(Math.round(value * 10) / 10)}%`;
}

const BN_MONTHS = [
  "জানু",
  "ফেব",
  "মার্চ",
  "এপ্রিল",
  "মে",
"জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

export function bnMonth(monthIndex: number): string {
  return BN_MONTHS[monthIndex] ?? "";
}

/** Format an ISO date/datetime as d/m/yyyy in Bengali digits (like the original app). */
export function bnDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${bnNum(d.getDate())}/${bnNum(d.getMonth() + 1)}/${bnNum(d.getFullYear())}`;
}

export function bnDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const date = bnDate(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "সকাল" : h < 17 ? "দুপুর" : "সন্ধ্যা";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${date} · ${ampm} ${bnNum(h)}:${bnNum(m).padStart(2, "০")}`;
}

export function num(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return isFinite(n) ? n : 0;
}
