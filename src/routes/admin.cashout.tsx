import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addCashout, getInvestors } from "@/lib/data.functions";
import { getMySessionInfo } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { bnTaka } from "@/lib/format";

export const Route = createFileRoute("/admin/cashout")({
  head: () => ({
    meta: [
      { title: "Village Agro — ক্যাশআউট" },
      { name: "description", content: "বিনিয়োগকারীদের ক্যাশআউট রেকর্ড করুন।" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Village Agro — ক্যাশআউট" },
      { property: "og:description", content: "বিনিয়োগকারীদের ক্যাশআউট রেকর্ড করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CashoutPage,
});

function CashoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [investorId, setInvestorId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      try {
        const info = await getMySessionInfo();
        if (!info.isAdmin) {
          navigate({ to: "/" });
          return;
        }
        setReady(true);
      } catch {
        navigate({ to: "/login" });
      }
    });
  }, [navigate]);

  const { data: investors } = useQuery({
    queryKey: ["investors"],
    queryFn: () => getInvestors(),
    enabled: ready,
  });

  const mutation = useMutation({
    mutationFn: () =>
      addCashout({
        data: {
          investorId,
          amount: parseFloat(amount),
          date: new Date().toISOString().slice(0, 10),
          note,
        },
      }),
    onSuccess: () => {
      toast.success("ক্যাশআউট রেকর্ড হয়েছে");
      setAmount("");
      setNote("");
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!ready) {
    return (
      <div className="page-container">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-lg">
      <h1 className="mb-5 text-2xl font-bold">ক্যাশআউট</h1>
      <form
        className="space-y-4 rounded-2xl border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-medium">বিনিয়োগকারী</label>
          <select
            value={investorId}
            onChange={(e) => setInvestorId(e.target.value)}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">নির্বাচন করুন</option>
            {(investors ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — বর্তমান {bnTaka(i.total - i.cashout)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">পরিমাণ (৳)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            inputMode="numeric"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">নোট (ঐচ্ছিক)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {mutation.isPending ? "অপেক্ষা করুন…" : "ক্যাশআউট সংরক্ষণ"}
        </button>
      </form>
    </div>
  );
}
