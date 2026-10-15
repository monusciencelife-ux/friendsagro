import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { getDownloadData } from "@/lib/data.functions";
import { TABS } from "@/lib/sheets.shared";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Village Agro — ডেটা ডাউনলোড" },
      { name: "description", content: "সকল রেকর্ড এক্সেল ফাইলে ডাউনলোড করুন।" },
      { property: "og:title", content: "Village Agro — ডেটা ডাউনলোড" },
      { property: "og:description", content: "সকল রেকর্ড এক্সেল ফাইলে ডাউনলোড করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DownloadPage,
});

const TAB_LABELS: Record<string, string> = {
  profiles: "প্রোফাইল",
  investments: "বিনিয়োগ",
  cashouts: "ক্যাশআউট",
  requests: "অনুরোধ",
  projects: "প্রকল্প",
  project_steps: "প্রকল্পের ধাপ",
  project_sales: "বিক্রয়",
  profit_distributions: "লাভ বণ্টন",
  percentage_snapshots: "অংশ স্ন্যাপশট",
  bill_causes: "বিলের কারণ",
  chat_messages: "চ্যাট বার্তা",
};

function DownloadPage() {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await getDownloadData();
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      for (const tab of Object.keys(TABS) as (keyof typeof TABS)[]) {
        const headers = [...TABS[tab]] as string[];
        const rows = (data as Record<string, Record<string, string>[]>)[tab] ?? [];
        const aoa = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, tab.slice(0, 31));
      }
      XLSX.writeFile(wb, `village-agro-data-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("ডাউনলোড শুরু হয়েছে");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ডাউনলোড ব্যর্থ হয়েছে");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-container">
      <h1 className="mb-5 text-2xl font-bold">ডেটা ডাউনলোড</h1>
      <div className="rounded-2xl border bg-card p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <FileSpreadsheet className="h-7 w-7" />
        </span>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
          সকল ট্যাব ({Object.values(TAB_LABELS).join("، ")}) সহ সম্পূর্ণ ডেটা একটি এক্সেল
          ফাইলে ডাউনলোড করুন।
        </p>
        <button
          onClick={handleDownload}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {busy ? "প্রস্তুত হচ্ছে…" : "এক্সেল ডাউনলোড"}
        </button>
      </div>
    </div>
  );
}
