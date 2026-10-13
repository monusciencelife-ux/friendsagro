import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase } from "lucide-react";
import { getProjects } from "@/lib/data.functions";
import { bnDate, bnTaka } from "@/lib/format";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Village Agro — প্রকল্প তালিকা" },
      { name: "description", content: "সকল চলমান ও সম্পন্ন প্রকল্পের তালিকা।" },
      { property: "og:title", content: "Village Agro — প্রকল্প তালিকা" },
      { property: "og:description", content: "সকল চলমান ও সম্পন্ন প্রকল্পের তালিকা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsPage,
});

const FILTERS = [
  { key: "all", label: "সব" },
  { key: "active", label: "সক্রিয়" },
  { key: "completed", label: "সম্পন্ন" },
] as const;

function ProjectsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });

  const projects = (data ?? []).filter((p) => filter === "all" || p.status === filter);

  return (
    <div className="page-container">
      <h1 className="mb-5 text-2xl font-bold">প্রকল্প তালিকা</h1>

      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card py-16 text-muted-foreground">
          <Briefcase className="h-8 w-8" />
          <p>কোনো প্রকল্প নেই</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              to="/projects/$id"
              params={{ id: p.id }}
              className="stat-card block"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-bold">{p.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === "completed"
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {p.status === "completed" ? "সম্পন্ন" : "সক্রিয়"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{bnDate(p.started_at)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ব্যয়: </span>
                  <span className="font-semibold">{bnTaka(p.spent)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">বাজেট: </span>
                  <span className="font-semibold">{bnTaka(p.estimated_investment)}</span>
                </div>
                {p.status === "completed" && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">প্রকৃত লাভ: </span>
                    <span className="font-bold text-primary">{bnTaka(p.actual_profit)}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
