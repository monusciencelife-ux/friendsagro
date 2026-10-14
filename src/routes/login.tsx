import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveLoginEmail } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Village Agro — লগইন" },
      { name: "description", content: "আপনার অ্যাকাউন্টে লগইন করুন।" },
      { property: "og:title", content: "Village Agro — লগইন" },
      { property: "og:description", content: "আপনার অ্যাকাউন্টে লগইন করুন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { email } = await resolveLoginEmail({ data: { identifier } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("ইমেইল/ফোন বা পাসওয়ার্ড ভুল");
        return;
      }
      toast.success("লগইন সফল");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "লগইন ব্যর্থ হয়েছে");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold">লগইন</h1>
          <p className="text-sm text-muted-foreground">Village Agro সমবায়</p>
        </div>

        <label className="mb-1 block text-sm font-medium">ইমেইল বা ফোন নম্বর</label>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mb-4 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="example@mail.com বা 01XXXXXXXXX"
          required
        />

        <label className="mb-1 block text-sm font-medium">পাসওয়ার্ড</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "অপেক্ষা করুন…" : "লগইন"}
        </button>
      </form>
    </div>
  );
}
