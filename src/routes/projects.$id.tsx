import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MessageSquare, PlusCircle } from "lucide-react";
import {
  addProjectSale,
  addProjectStep,
  completeProject,
  getProject,
  sendChatMessage,
} from "@/lib/data.functions";
import { bnDate, bnTaka, num } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { getMySessionInfo } from "@/lib/auth.functions";
import { ProjectHistory } from "@/components/ProjectHistory";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Village Agro — প্রকল্পের বিবরণ" },
      { name: "description", content: "প্রকল্পের ধাপ, বিক্রয়, লাভ বণ্টন ও আলোচনা।" },
      { property: "og:title", content: "Village Agro — প্রকল্পের বিবরণ" },
      { property: "og:description", content: "প্রকল্পের ধাপ, বিক্রয়, লাভ বণ্টন ও আলোচনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject({ data: { id } }),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: s }) => {
      setSignedIn(!!s.session);
      if (s.session) {
        try {
          const info = await getMySessionInfo();
          setIsAdmin(info.isAdmin);
        } catch {
          setIsAdmin(false);
        }
      }
    });
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["project", id] });

  if (isError) return <div className="page-container" role="alert"><p className="text-destructive">প্রকল্পের তথ্য পাওয়া যায়নি।</p><Button variant="outline" onClick={() => invalidate()}>আবার চেষ্টা করুন</Button></div>;

  if (isLoading || !data) {
    return (
      <div className="page-container">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const { project, steps, sales, distributions, snapshots, chat } = data;
  const p = (k: string) => project[k] ?? "";
  const spent = steps.reduce((a, s) => a + num(s["amount"]), 0);
  const sold = sales.reduce((a, s) => a + num(s["amount"]), 0);

  return (
    <div className="page-container">
      <Link to="/projects" className="mb-4 inline-block text-sm text-primary">← প্রকল্প তালিকা</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{p("name")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">শুরু: {bnDate(p("started_at")) || "—"}{p("completed_at") && <> · সম্পন্ন: {bnDate(p("completed_at"))}</>}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            p("status") === "completed"
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {p("status") === "completed" ? "সম্পন্ন" : "সক্রিয়"}
        </span>
      </div>

      {p("description") && (
        <p className="mt-3 text-sm text-muted-foreground">{p("description")}</p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "আনুমানিক বিনিয়োগ", value: bnTaka(p("estimated_investment")) },
          { label: "মোট ব্যয়", value: bnTaka(spent) },
          { label: "মোট বিক্রয়", value: bnTaka(sold) },
          {
            label: p("status") === "completed" ? "প্রকৃত লাভ / ক্ষতি" : "বর্তমান লাভ / ক্ষতি",
            value: bnTaka(sold - spent),
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border-t pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">ব্যয়ের ধাপসমূহ</h2>
            {isAdmin && p("status") === "active" && (
              <StepForm projectId={id} onDone={invalidate} />
            )}
          </div>
          <ul className="divide-y">
            {steps.map((s) => (
              <li key={s["id"]} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{s["reason"]}</p>
                  <p className="text-xs text-muted-foreground">{bnDate(s["date"])}</p>
                </div>
                <span className="font-semibold">{bnTaka(s["amount"])}</span>
              </li>
            ))}
            {steps.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">কোনো ধাপ নেই</p>
            )}
          </ul>
        </section>

        <section className="border-t pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">বিক্রয়</h2>
            {isAdmin && p("status") === "active" && (
              <SaleForm projectId={id} onDone={invalidate} />
            )}
          </div>
          <ul className="divide-y">
            {sales.map((s) => (
              <li key={s["id"]} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{s["name"]}</p>
                  <p className="text-xs text-muted-foreground">{bnDate(s["date"])}</p>
                </div>
                <span className="font-semibold text-primary">{bnTaka(s["amount"])}</span>
              </li>
            ))}
            {sales.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">কোনো বিক্রয় নেই</p>
            )}
          </ul>
        </section>
      </div>

      <ProjectHistory project={project} steps={steps} sales={sales} snapshots={snapshots} distributions={distributions} />

      {p("notes") && <section className="mt-6 border-t pt-5"><h2 className="section-title mb-3">প্রকল্পের নোট</h2><p className="whitespace-pre-wrap break-words text-sm">{p("notes")}</p></section>}

      {isAdmin && p("status") === "active" && (
        <CompleteButton projectId={id} onDone={invalidate} />
      )}

      <section className="mt-6 border-t pt-5">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> আলোচনা
        </h2>
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {chat.map((m) => (
            <div key={m["id"]} className="rounded-xl bg-muted px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{m["senderName"]}</span>
                <span className="text-xs text-muted-foreground">{bnDate(m["created_at"])}</span>
              </div>
              <p className="mt-0.5 text-sm">{m["message"]}</p>
            </div>
          ))}
          {chat.length === 0 && (
            <p className="text-sm text-muted-foreground">এখনও কোনো বার্তা নেই</p>
          )}
        </div>
        {signedIn ? (
          <ChatBox projectId={id} onDone={invalidate} />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">বার্তা পাঠাতে লগইন করুন।</p>
        )}
      </section>
    </div>
  );
}

function StepForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      addProjectStep({
        data: {
          projectId,
          reason,
          amount: parseFloat(amount),
          date: new Date().toISOString().slice(0, 10),
        },
      }),
    onSuccess: () => {
      toast.success("ধাপ যোগ হয়েছে");
      setOpen(false);
      setReason("");
      setAmount("");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-accent"
      >
        <PlusCircle className="h-3.5 w-3.5" /> ধাপ যোগ
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="কারণ"
        required
        className="w-32 rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="পরিমাণ"
        required
        inputMode="numeric"
        className="w-24 rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        সংরক্ষণ
      </button>
    </form>
  );
}

function SaleForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      addProjectSale({
        data: {
          projectId,
          name,
          amount: parseFloat(amount),
          date: new Date().toISOString().slice(0, 10),
        },
      }),
    onSuccess: () => {
      toast.success("বিক্রয় যোগ হয়েছে");
      setOpen(false);
      setName("");
      setAmount("");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-accent"
      >
        <PlusCircle className="h-3.5 w-3.5" /> বিক্রয় যোগ
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="বিবরণ"
        required
        className="w-32 rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="পরিমাণ"
        required
        inputMode="numeric"
        className="w-24 rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        সংরক্ষণ
      </button>
    </form>
  );
}

function CompleteButton({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const mutation = useMutation({
    mutationFn: () => completeProject({ data: { projectId } }),
    onSuccess: (r) => {
      toast.success(`প্রকল্প সম্পন্ন — লাভ ${bnTaka(r.profit)}`);
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <button
      onClick={() => {
        if (confirm("প্রকল্পটি সম্পন্ন হিসেবে চিহ্নিত করবেন? লাভ বণ্টন তৈরি হবে।"))
          mutation.mutate();
      }}
      disabled={mutation.isPending}
      className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
    >
      <CheckCircle2 className="h-4 w-4" /> প্রকল্প সম্পন্ন করুন
    </button>
  );
}

function ChatBox({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: () => sendChatMessage({ data: { projectId, message } }),
    onSuccess: () => {
      setMessage("");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (message.trim()) mutation.mutate();
      }}
    >
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="বার্তা লিখুন…"
        className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        পাঠান
      </button>
    </form>
  );
}
