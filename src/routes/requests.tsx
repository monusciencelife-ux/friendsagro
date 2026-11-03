import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bell, Check, Inbox, Plus, X } from "lucide-react";
import {
  chooseProfit, getMyNotifications, getRequests, reviewRequest,
  submitInvestmentRequest, submitProjectRequest, submitWithdrawRequest,
} from "@/lib/data.functions";
import { supabase } from "@/integrations/supabase/client";
import { bnDate, bnTaka } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Village Agro — অনুরোধসমূহ" },
      { name: "description", content: "বিনিয়োগ, নতুন প্রকল্প ও ব্যালেন্স উত্তোলনের অনুরোধ এবং লাভ–ক্ষতির নোটিফিকেশন।" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Village Agro — অনুরোধসমূহ" },
      { property: "og:description", content: "বিনিয়োগ ও প্রকল্পের অনুরোধ ব্যবস্থাপনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

const STATUS_LABEL: Record<string, string> = { pending: "অপেক্ষমাণ", approved: "অনুমোদিত", rejected: "প্রত্যাখ্যাত" };
const TYPE_LABEL: Record<string, string> = {
  invest: "বিনিয়োগ", project_create: "নতুন প্রকল্প", project_join: "প্রকল্পে যোগ", cashout: "ক্যাশআউট", withdraw: "ব্যালেন্স উত্তোলন",
};
const METHODS = ["বিকাশ (bKash)", "নগদ (Nagad)", "ব্যাংক (Bank)", "হাতে নগদ (Cash)"];

type Req = Record<string, any>;

function RequestCard({ r, onReview, busy }: { r: Req; onReview?: (d: "approved" | "rejected") => void; busy?: boolean }) {
  const p = r["parsed"] ?? {};
  const rows: [string, string][] = [];
  if (p.name) rows.push(["প্রকল্পের নাম", p.name]);
  if (p.amount) rows.push(["পরিমাণ", bnTaka(Number(p.amount))]);
  if (p.estimatedInvestment != null) rows.push(["আনুমানিক বিনিয়োগ", bnTaka(Number(p.estimatedInvestment))]);
  if (p.estimatedProfit) rows.push(["আনুমানিক লাভ", bnTaka(Number(p.estimatedProfit))]);
  if (p.method) rows.push(["মাধ্যম", p.method]);
  if (p.txnId) rows.push(["ট্রানজেকশন আইডি", p.txnId]);
  if (p.note) rows.push(["বিবরণ", p.note]);
  if (p.description) rows.push(["বিবরণ", p.description]);
  return (
    <div className="stat-card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold">{TYPE_LABEL[r["type"]] ?? r["type"]}</span>
          <p className="mt-2">{r["fromName"]} থেকে</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r["status"] === "pending" ? "bg-secondary text-secondary-foreground" : r["status"] === "approved" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>
          {STATUS_LABEL[r["status"]] ?? r["status"]}
        </span>
      </div>
      {rows.length > 0 && <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">{rows.map(([k, v], i) => <p key={i} className="break-words"><b>{k}:</b> {v}</p>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{bnDate(r["created_at"])}</p>
        {onReview && r["status"] === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onReview("approved")} disabled={busy}><Check /> অনুমোদন</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => onReview("rejected")} disabled={busy}><X /> প্রত্যাখ্যান</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<null | "project" | "invest" | "withdraw">(null);
  const fetchRequests = useServerFn(getRequests);
  const fetchNotes = useServerFn(getMyNotifications);
  const review = useServerFn(reviewRequest);
  const choose = useServerFn(chooseProfit);
  const sendInvest = useServerFn(submitInvestmentRequest);
  const sendProject = useServerFn(submitProjectRequest);
  const sendWithdraw = useServerFn(submitWithdrawRequest);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
      else setReady(true);
    });
  }, [navigate]);

  const requests = useQuery({ queryKey: ["requests"], queryFn: () => fetchRequests(), enabled: ready });
  const notes = useQuery({ queryKey: ["notifications"], queryFn: () => fetchNotes(), enabled: ready });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["requests"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["investor-history"] }); };

  const reviewM = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" }) => review({ data: input }),
    onSuccess: () => { toast.success("সমাধান হয়েছে"); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const chooseM = useMutation({
    mutationFn: (input: { distributionId: string; choice: "reinvest" | "withdraw" }) => choose({ data: input }),
    onSuccess: (_d, v) => { toast.success(v.choice === "reinvest" ? "লাভ পুনঃবিনিয়োগ হয়েছে" : "উত্তোলনের অনুরোধ অ্যাডমিনের কাছে পাঠানো হয়েছে"); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const submitM = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => { toast.success("অনুরোধ অ্যাডমিনের কাছে পাঠানো হয়েছে"); setDialog(null); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  if (!ready || requests.isLoading) return <div className="page-container"><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>;

  const all = (requests.data ?? []) as Req[];
  const isAdmin = all[0]?.["viewerIsAdmin"] === true || (notes.data?.pendingRequests ?? 0) > 0;
  const received = isAdmin ? all.filter((r) => r["status"] === "pending") : [];
  const sent = all.filter((r) => r["mine"]);
  const history = isAdmin ? all.filter((r) => r["status"] !== "pending" && !r["mine"]) : [];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => Number(f.get(k) || 0);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    if (dialog === "invest") submitM.mutate(() => sendInvest({ data: { amount: n("amount"), method: s("method"), txnId: s("txnId") } }));
    if (dialog === "project") submitM.mutate(() => sendProject({ data: { name: s("name"), estimatedInvestment: n("estimatedInvestment"), estimatedProfit: n("estimatedProfit") || undefined, description: s("description") } }));
    if (dialog === "withdraw") submitM.mutate(() => sendWithdraw({ data: { amount: n("amount"), note: s("note") } }));
  }

  return (
    <div className="page-container space-y-6">
      <h1 className="text-2xl font-bold">অনুরোধসমূহ</h1>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setDialog("project")}><Plus /> নতুন প্রোজেক্ট তৈরীর আবেদন</Button>
        <Button variant="outline" onClick={() => setDialog("invest")}><Plus /> বিনিয়োগের তথ্য যাচাই</Button>
        <Button variant="outline" onClick={() => setDialog("withdraw")}><Plus /> ব্যালেন্স উত্তোলনের আবেদন</Button>
      </div>

      {(notes.data?.items.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Bell className="size-5" /> লাভ/ক্ষতির নোটিফিকেশন</h2>
          {notes.data!.items.map((n) => (
            <div key={n.id} className="stat-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{n.projectName || "প্রকল্প"} সম্পন্ন হয়েছে</p>
                <p className={`text-lg font-bold ${n.amount < 0 ? "text-destructive" : "text-primary"}`}>
                  আপনার {n.amount < 0 ? "ক্ষতি" : "লাভ"}: {n.amount < 0 ? "−" : "+"}{bnTaka(Math.abs(n.amount))}
                </p>
                <p className="text-xs text-muted-foreground">{bnDate(n.date)}</p>
              </div>
              {n.needsChoice ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={chooseM.isPending} onClick={() => chooseM.mutate({ distributionId: n.id, choice: "reinvest" })}>পুনঃবিনিয়োগ</Button>
                  <Button size="sm" variant="outline" disabled={chooseM.isPending} onClick={() => chooseM.mutate({ distributionId: n.id, choice: "withdraw" })}>ব্যালেন্স উত্তোলন</Button>
                </div>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {n.choice === "reinvest" ? "পুনঃবিনিয়োগ করা হয়েছে" : n.choice === "withdraw" ? "উত্তোলনের অনুরোধ করা হয়েছে" : "ব্যালেন্সে যোগ/বিয়োগ হয়েছে"}
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      {isAdmin && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Inbox className="size-5" /> প্রাপ্ত অনুরোধ ({received.length} অপেক্ষমাণ)</h2>
          {received.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground"><Inbox className="h-8 w-8" /><p>কোনো অনুরোধ নেই</p></div>
          ) : received.map((r) => <RequestCard key={r["id"]} r={r} busy={reviewM.isPending} onReview={(d) => reviewM.mutate({ id: r["id"], decision: d })} />)}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">প্রেরিত অনুরোধ</h2>
        {sent.length === 0 ? <p className="text-muted-foreground">কোনো অনুরোধ পাঠানো হয়নি</p> : sent.map((r) => <RequestCard key={r["id"]} r={r} />)}
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">সমাধানকৃত অনুরোধ</h2>
          {history.map((r) => <RequestCard key={r["id"]} r={r} />)}
        </section>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "project" ? "নতুন প্রোজেক্ট তৈরীর আবেদন" : dialog === "invest" ? "বিনিয়োগের তথ্য যাচাই" : "ব্যালেন্স উত্তোলনের আবেদন"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            {dialog === "project" && <>
              <div><Label htmlFor="name">প্রকল্পের নাম</Label><Input id="name" name="name" required maxLength={200} /></div>
              <div><Label htmlFor="ei">আনুমানিক বিনিয়োগ (৳)</Label><Input id="ei" name="estimatedInvestment" type="number" min={0} step="0.01" required /></div>
              <div><Label htmlFor="ep">আনুমানিক লাভ (৳)</Label><Input id="ep" name="estimatedProfit" type="number" min={0} step="0.01" /></div>
              <div><Label htmlFor="desc">বিবরণ</Label><Textarea id="desc" name="description" maxLength={2000} /></div>
            </>}
            {dialog === "invest" && <>
              <div><Label htmlFor="amt">পরিমাণ (৳)</Label><Input id="amt" name="amount" type="number" min={1} step="0.01" required /></div>
              <div><Label htmlFor="method">মাধ্যম</Label>
                <select id="method" name="method" required className="mt-1 block h-9 w-full rounded-md border bg-background px-3">{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
              <div><Label htmlFor="txn">ট্রানজেকশন আইডি</Label><Input id="txn" name="txnId" maxLength={100} /></div>
            </>}
            {dialog === "withdraw" && <>
              <p className="text-sm text-muted-foreground">উত্তোলনযোগ্য ব্যালেন্স: <b>{bnTaka(notes.data?.withdrawable ?? 0)}</b></p>
              <div><Label htmlFor="wamt">পরিমাণ (৳)</Label><Input id="wamt" name="amount" type="number" min={1} step="0.01" max={notes.data?.withdrawable || undefined} required /></div>
              <div><Label htmlFor="note">কারণ / বিবরণ</Label><Textarea id="note" name="note" maxLength={500} /></div>
            </>}
            <Button type="submit" className="w-full" disabled={submitM.isPending}>অ্যাডমিনের কাছে পাঠান</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
