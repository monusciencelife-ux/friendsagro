import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { bootstrapAdmin, setupNeeded } from "@/lib/auth.functions";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Village Agro — প্রথম অ্যাডমিন সেটআপ" },
      { name: "description", content: "প্রথম অ্যাডমিন অ্যাকাউন্ট তৈরি করুন।" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Village Agro — প্রথম অ্যাডমিন সেটআপ" },
      { property: "og:description", content: "প্রথম অ্যাডমিন অ্যাকাউন্ট তৈরি করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const { data, isLoading } = useQuery({ queryKey: ["setup-needed"], queryFn: () => setupNeeded() });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await bootstrapAdmin({ data: { name, email, password } });
      toast.success("অ্যাডমিন অ্যাকাউন্ট তৈরি হয়েছে — এখন লগইন করুন");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ব্যর্থ হয়েছে");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold">প্রথম অ্যাডমিন সেটআপ</h1>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">যাচাই করা হচ্ছে…</p>
        ) : data && !data.needed ? (
          <p className="text-center text-sm text-muted-foreground">
            অ্যাডমিন অ্যাকাউন্ট ইতিমধ্যে তৈরি আছে। লগইন পেজ থেকে প্রবেশ করুন।
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-sm font-medium">নাম</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-4 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <label className="mb-1 block text-sm font-medium">ইমেইল</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <label className="mb-1 block text-sm font-medium">পাসওয়ার্ড</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "অপেক্ষা করুন…" : "অ্যাডমিন তৈরি করুন"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
