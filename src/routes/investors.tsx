import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, UserRound } from "lucide-react";
import { getInvestors } from "@/lib/data.functions";
import { bnPercent, bnTaka } from "@/lib/format";

export const Route = createFileRoute("/investors")({
  head: () => ({
    meta: [
      { title: "Village Agro — বিনিয়োগকারী তালিকা" },
      { name: "description", content: "প্রতিটি বিনিয়োগকারীর জমা ও অংশ।" },
      { property: "og:title", content: "Village Agro — বিনিয়োগকারী তালিকা" },
      { property: "og:description", content: "প্রতিটি বিনিয়োগকারীর জমা ও অংশ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvestorsPage,
});

function InvestorsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["investors"],
    queryFn: () => getInvestors(),
  });

  return (
    <div className="page-container">
      <h1 className="mb-5 text-2xl font-bold">বিনিয়োগকারী তালিকা</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((inv, i) => (
            <div key={inv.id} className="stat-card flex items-center gap-4">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <UserRound className="h-6 w-6" />
                {i === 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-primary p-1 text-primary-foreground">
                    <Crown className="h-3 w-3" />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{inv.name}</p>
                {i === 0 && <p className="text-xs text-muted-foreground">বেশি জমা</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{bnTaka(inv.total)}</p>
                <p className="text-xs text-muted-foreground">{bnPercent(inv.pct)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
