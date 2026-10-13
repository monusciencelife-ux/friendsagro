import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  Users,
  Briefcase,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboard } from "@/lib/data.functions";
import { bnDate, bnMonth, bnNum, bnPercent, bnTaka } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Village Agro — ড্যাশবোর্ড" },
      {
        name: "description",
        content: "নেট তহবিল, বিনিয়োগ, প্রকল্প ও লাভের সারসংক্ষেপ।",
      },
      { property: "og:title", content: "Village Agro — ড্যাশবোর্ড" },
      {
        property: "og:description",
        content: "নেট তহবিল, বিনিয়োগ, প্রকল্প ও লাভের সারসংক্ষেপ।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const PIE_COLORS = [
  "oklch(0.51 0.125 152)",
  "oklch(0.65 0.15 145)",
  "oklch(0.72 0.14 120)",
  "oklch(0.78 0.13 95)",
  "oklch(0.6 0.1 180)",
];

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="stat-card h-24 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "নেট তহবিল", value: bnTaka(data.netFund), icon: Wallet, primary: true },
    { label: "ব্যবহার যোগ্য", value: bnTaka(data.available), icon: PiggyBank },
    { label: "বিনিয়োগ করা", value: bnTaka(data.invested), icon: TrendingUp },
    { label: "বিনিয়োগকারী", value: bnNum(data.investorCount), icon: Users },
    { label: "সক্রিয় প্রকল্প", value: bnNum(data.activeCount), icon: Briefcase },
    { label: "সম্পন্ন প্রকল্প", value: bnNum(data.completedCount), icon: CheckCircle2 },
    { label: "মোট লাভ", value: bnTaka(data.totalProfit), icon: TrendingUp },
  ];

  return (
    <div className="page-container">
      <h1 className="mb-5 text-2xl font-bold">ড্যাশবোর্ড</h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`stat-card ${s.primary ? "bg-primary text-primary-foreground" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-medium sm:text-sm ${
                  s.primary ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              <s.icon
                className={`h-4 w-4 ${s.primary ? "text-primary-foreground/70" : "text-primary"}`}
              />
            </div>
            <p className="mt-2 text-xl font-bold sm:text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="section-title mb-4">সাম্প্রতিক লেনদেন</h2>
          <ul className="divide-y">
            {data.recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      r.kind === "investment"
                        ? "bg-accent text-accent-foreground"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {r.kind === "investment" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{bnDate(r.date)}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold ${
                    r.amount >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {r.amount >= 0 ? "+" : "−"}
                  {bnTaka(Math.abs(r.amount))}
                </span>
              </li>
            ))}
            {data.recent.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">কোনো লেনদেন নেই</p>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="section-title mb-4">বিনিয়োগকারীদের অংশ</h2>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.shares}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.shares.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => bnTaka(v)}
                    contentStyle={{ borderRadius: 12, fontSize: 13 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-2">
              {data.shares.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-auto text-muted-foreground">{bnPercent(s.pct)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="section-title mb-4">মাসিক বিনিয়োগ প্রবণতা</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly}>
              <XAxis
                dataKey="month"
                tickFormatter={(m: number) => bnMonth(m)}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis tickFormatter={(v: number) => bnNum(v)} tick={{ fontSize: 11 }} width={50} />
              <Tooltip
                formatter={(v: number) => bnTaka(v)}
                labelFormatter={(m: number) => bnMonth(m)}
                contentStyle={{ borderRadius: 12, fontSize: 13 }}
              />
              <Bar dataKey="total" fill="oklch(0.51 0.125 152)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
