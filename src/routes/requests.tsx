import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Inbox, X } from "lucide-react";
import { getRequests, reviewRequest } from "@/lib/data.functions";
import { supabase } from "@/integrations/supabase/client";
import { bnDate, bnTaka } from "@/lib/format";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Village Agro — অনুরোধসমূহ" },
      { name: "description", content: "বিনিয়োগ ও প্রকল্পের অনুরোধ অনুমোদন করুন।" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Village Agro — অনুরোধসমূহ" },
      { property: "og:description", content: "বিনিয়োগ ও প্রকল্পের অনুরোধ ব্যবস্থাপনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  approved: "অনুমোদিত",
  rejected: "প্রত্যাখ্যাত",
};

const TYPE_LABEL: Record<string, string> = {
  invest: "বিনিয়োগ",
  project_create: "প্রকল্প তৈরি",
  project_join: "প্রকল্পে যোগ",
  cashout: "ক্যাশআউট",
};

function RequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
      else setReady(true);
    });
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => getRequests(),
    enabled: ready,
    refetchInterval: 30_000,
  });

  const review = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" }) =>
      reviewRequest({ data: input }),
    onSuccess: () => {
      toast.success("সমাধান হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (!ready || isLoading) {
    return (
      <div className="page-container">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="mb-5 text-2xl font-bold">অনুরোধসমূহ</h1>
      {(data ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card py-16 text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p>কোনো অনুরোধ নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((r) => (
            <div key={r["id"]} className="stat-card flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {r["fromName"]} — {TYPE_LABEL[r["type"] ?? ""] ?? r["type"]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {r["parsed"]?.["amount"] ? `${bnTaka(r["parsed"]["amount"])} · ` : ""}
                  {r["parsed"]?.["method"] ? `${r["parsed"]["method"]} · ` : ""}
                  {bnDate(r["created_at"])}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  r["status"] === "pending"
                    ? "bg-secondary text-secondary-foreground"
                    : r["status"] === "approved"
                      ? "bg-accent text-accent-foreground"
                      : "bg-destructive/10 text-destructive"
                }`}
              >
                {STATUS_LABEL[r["status"] ?? ""] ?? r["status"]}
              </span>
              {r["status"] === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => review.mutate({ id: r["id"] ?? "", decision: "approved" })}
                    disabled={review.isPending}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" /> অনুমোদন
                  </button>
                  <button
                    onClick={() => review.mutate({ id: r["id"] ?? "", decision: "rejected" })}
                    disabled={review.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> প্রত্যাখ্যান
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
