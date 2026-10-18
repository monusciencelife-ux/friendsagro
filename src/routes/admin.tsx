import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Receipt, UserPlus, Users } from "lucide-react";
import { addBillCause, createProject, getBillCauses, submitInvestmentRequest } from "@/lib/data.functions";
import { adminCreateUser, changePassword, getMySessionInfo, listUsers } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { bnDate } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Village Agro — অ্যাডমিন সেটিংস" },
      { name: "description", content: "ব্যবহারকারী, বিলের কারণ ও পাসওয়ার্ড ব্যবস্থাপনা।" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Village Agro — অ্যাডমিন সেটিংস" },
      { property: "og:description", content: "ব্যবহারকারী ও অ্যাকাউন্ট ব্যবস্থাপনা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <div className="page-container">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="mb-5 text-2xl font-bold">অ্যাডমিন সেটিংস</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <CreateUserCard />
        <ChangePasswordCard />
        <BillCausesCard />
        <CreateProjectCard />
        <UsersCard />
        <InvestRequestCard />
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="section-title mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btnCls =
  "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60";

function CreateUserCard() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => adminCreateUser({ data: { name, phone, password } }),
    onSuccess: () => {
      toast.success("ব্যবহারকারী তৈরি হয়েছে");
      setName("");
      setPhone("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card title="নতুন ব্যবহারকারী" icon={UserPlus}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম" required className={inputCls} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ফোন নম্বর" required className={inputCls} />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
          required
          minLength={6}
          className={inputCls}
        />
        <button type="submit" disabled={mutation.isPending} className={btnCls}>
          {mutation.isPending ? "অপেক্ষা করুন…" : "তৈরি করুন"}
        </button>
      </form>
    </Card>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const mutation = useMutation({
    mutationFn: () => changePassword({ data: { currentPassword: current, newPassword: next } }),
    onSuccess: () => {
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
      setCurrent("");
      setNext("");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card title="পাসওয়ার্ড পরিবর্তন" icon={KeyRound}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="বর্তমান পাসওয়ার্ড"
          required
          className={inputCls}
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
          required
          minLength={6}
          className={inputCls}
        />
        <button type="submit" disabled={mutation.isPending} className={btnCls}>
          {mutation.isPending ? "অপেক্ষা করুন…" : "পরিবর্তন করুন"}
        </button>
      </form>
    </Card>
  );
}

function BillCausesCard() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const { data } = useQuery({ queryKey: ["bill-causes"], queryFn: () => getBillCauses() });
  const mutation = useMutation({
    mutationFn: () => addBillCause({ data: { name } }),
    onSuccess: () => {
      toast.success("যোগ হয়েছে");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["bill-causes"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card title="বিলের কারণ" icon={Receipt}>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="নতুন কারণ" required className={inputCls} />
        <button type="submit" disabled={mutation.isPending} className={btnCls}>
          যোগ
        </button>
      </form>
      <ul className="space-y-1.5 text-sm">
        {(data ?? []).map((c) => (
          <li key={c["id"]} className="rounded-lg bg-muted px-3 py-1.5">
            {c["name"]}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CreateProjectCard() {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      createProject({ data: { name, estimatedInvestment: parseFloat(budget) || 0 } }),
    onSuccess: () => {
      toast.success("প্রকল্প তৈরি হয়েছে");
      setName("");
      setBudget("");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card title="নতুন প্রকল্প" icon={Users}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="প্রকল্পের নাম" required className={inputCls} />
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="আনুমানিক বিনিয়োগ (৳)"
          inputMode="numeric"
          className={inputCls}
        />
        <button type="submit" disabled={mutation.isPending} className={btnCls}>
          {mutation.isPending ? "অপেক্ষা করুন…" : "তৈরি করুন"}
        </button>
      </form>
    </Card>
  );
}

function UsersCard() {
  const { data } = useQuery({ queryKey: ["users"], queryFn: () => listUsers() });
  return (
    <Card title="নিবন্ধিত ব্যবহারকারী" icon={Users}>
      <ul className="divide-y text-sm">
        {(data ?? []).map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2">
            <span className="font-medium">{u.name}</span>
            <span className="text-xs text-muted-foreground">
              {u.phone} · {bnDate(u.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function InvestRequestCard() {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("বিকাশ");
  const mutation = useMutation({
    mutationFn: () =>
      submitInvestmentRequest({ data: { amount: parseFloat(amount), method } }),
    onSuccess: () => {
      toast.success("বিনিয়োগ অনুরোধ পাঠানো হয়েছে");
      setAmount("");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card title="বিনিয়োগ অনুরোধ (পরীক্ষা)" icon={UserPlus}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="পরিমাণ (৳)"
          required
          inputMode="numeric"
          className={inputCls}
        />
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
          <option>বিকাশ</option>
          <option>নগদ</option>
          <option>রকেট</option>
          <option>ব্যাংক</option>
        </select>
        <button type="submit" disabled={mutation.isPending} className={btnCls}>
          {mutation.isPending ? "অপেক্ষা করুন…" : "অনুরোধ পাঠান"}
        </button>
      </form>
    </Card>
  );
}
