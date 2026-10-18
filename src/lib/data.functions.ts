// Server functions: read models and mutations backed by Google Sheets.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  appendRow,
  invalidateAll,
  newId,
  nowIso,
  readTabs,
  updateRow,
  type Row,
} from "./sheets.server";
import { num } from "./format";

const DATA_TABS = [
  "profiles",
  "investments",
  "cashouts",
  "requests",
  "projects",
  "project_steps",
  "project_sales",
  "profit_distributions",
  "percentage_snapshots",
  "bill_causes",
  "chat_messages",
] as const;

/** Safe cell accessor for sheet rows (index-signature friendly). */
function v(row: Row, key: string): string {
  return row[key] ?? "";
}

async function loadAll(fresh = false) {
  return readTabs([...DATA_TABS], fresh);
}

function profileName(profiles: Row[], id: string): string {
  return v(profiles.find((p) => v(p, "id") === id) ?? {}, "name") || "অজানা";
}

// ---------- Public reads ----------

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const t = await loadAll();
  const totalInvested = t.investments.reduce((s, r) => s + num(v(r, "amount")), 0);
  const totalCashout = t.cashouts.reduce((s, r) => s + num(v(r, "amount")), 0);
  const netFund = totalInvested - totalCashout;

  const activeProjects = t.projects.filter((p) => v(p, "status") === "active");
  const completedProjects = t.projects.filter((p) => v(p, "status") === "completed");
  const lockedInActive = activeProjects.reduce(
    (s, p) =>
      s +
      t.project_steps
        .filter((st) => v(st, "project_id") === v(p, "id"))
        .reduce((a, st) => a + num(v(st, "amount")), 0),
    0,
  );
  const totalProfit = completedProjects.reduce((s, p) => s + num(v(p, "actual_profit")), 0);

  const byInvestor = new Map<string, number>();
  for (const inv of t.investments) {
    const id = v(inv, "investor_id");
    byInvestor.set(id, (byInvestor.get(id) ?? 0) + num(v(inv, "amount")));
  }
  const shares = [...byInvestor.entries()]
    .map(([id, total]) => ({
      id,
      name: profileName(t.profiles, id),
      total,
      pct: totalInvested > 0 ? (total / totalInvested) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const recent = [
    ...t.investments.map((r) => ({
      id: v(r, "id"),
      kind: "investment" as const,
      name: profileName(t.profiles, v(r, "investor_id")),
      amount: num(v(r, "amount")),
      date: v(r, "date") || v(r, "created_at"),
    })),
    ...t.cashouts.map((r) => ({
      id: v(r, "id"),
      kind: "cashout" as const,
      name: profileName(t.profiles, v(r, "investor_id")),
      amount: -num(v(r, "amount")),
      date: v(r, "date") || v(r, "created_at"),
    })),
  ]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 8);

  // Monthly investment trend for the last 12 months
  const now = new Date();
  const months: { key: string; month: number; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.getMonth(), total: 0 });
  }
  for (const inv of t.investments) {
    const d = new Date(v(inv, "date") || v(inv, "created_at"));
    if (isNaN(d.getTime())) continue;
    const slot = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (slot) slot.total += num(v(inv, "amount"));
  }

  return {
    netFund,
    available: netFund - lockedInActive,
    invested: lockedInActive,
    investorCount: byInvestor.size,
    activeCount: activeProjects.length,
    completedCount: completedProjects.length,
    totalProfit,
    recent,
    shares,
    monthly: months.map((m) => ({ month: m.month, total: m.total })),
  };
});

export const getProjects = createServerFn({ method: "GET" }).handler(async () => {
  const t = await loadAll();
  return t.projects
    .map((p) => ({
      id: v(p, "id"),
      name: v(p, "name"),
      status: v(p, "status"),
      estimated_investment: v(p, "estimated_investment"),
      estimated_profit: v(p, "estimated_profit"),
      actual_profit: v(p, "actual_profit"),
      started_at: v(p, "started_at"),
      completed_at: v(p, "completed_at"),
      created_at: v(p, "created_at"),
      description: v(p, "description"),
      spent: t.project_steps
        .filter((s) => v(s, "project_id") === v(p, "id"))
        .reduce((a, s) => a + num(v(s, "amount")), 0),
      sold: t.project_sales
        .filter((s) => v(s, "project_id") === v(p, "id"))
        .reduce((a, s) => a + num(v(s, "amount")), 0),
      managerName: v(p, "manager_id") ? profileName(t.profiles, v(p, "manager_id")) : "",
    }))
    .sort((a, b) => (b["created_at"] ?? "").localeCompare(a["created_at"] ?? ""));
});

export const getProject = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const t = await loadAll();
    const project = t.projects.find((p) => v(p, "id") === data.id);
    if (!project) throw new Error("প্রকল্প পাওয়া যায়নি");
    const pid = v(project, "id");
    const steps = t.project_steps
      .filter((s) => v(s, "project_id") === pid)
      .sort((a, b) => v(a, "date").localeCompare(v(b, "date")));
    const sales = t.project_sales
      .filter((s) => v(s, "project_id") === pid)
      .sort((a, b) => v(a, "date").localeCompare(v(b, "date")));
    const distributions = t.profit_distributions
      .filter((d) => v(d, "project_id") === pid)
      .map((d) => ({ ...d, investorName: profileName(t.profiles, v(d, "investor_id")) }) as Row);
    const snapshots = t.percentage_snapshots
      .filter((s) => v(s, "project_id") === pid)
      .map((s) => ({ ...s, investorName: profileName(t.profiles, v(s, "investor_id")) }) as Row);
    const chat = t.chat_messages
      .filter((m) => v(m, "project_id") === pid)
      .map((m) => ({ ...m, senderName: profileName(t.profiles, v(m, "sender_id")) }) as Row)
      .sort((a, b) => v(a, "created_at").localeCompare(v(b, "created_at")));
    return { project, steps, sales, distributions, snapshots, chat };
  });

export const getInvestors = createServerFn({ method: "GET" }).handler(async () => {
  const t = await loadAll();
  const totalInvested = t.investments.reduce((s, r) => s + num(v(r, "amount")), 0);
  const byInvestor = new Map<string, number>();
  for (const inv of t.investments) {
    const id = v(inv, "investor_id");
    byInvestor.set(id, (byInvestor.get(id) ?? 0) + num(v(inv, "amount")));
  }
  const cashoutByInvestor = new Map<string, number>();
  for (const c of t.cashouts) {
    const id = v(c, "investor_id");
    cashoutByInvestor.set(id, (cashoutByInvestor.get(id) ?? 0) + num(v(c, "amount")));
  }
  return t.profiles
    .map((p) => {
      const id = v(p, "id");
      const total = byInvestor.get(id) ?? 0;
      return {
        id,
        name: v(p, "name"),
        phone: v(p, "phone"),
        photo_url: v(p, "photo_url"),
        total,
        cashout: cashoutByInvestor.get(id) ?? 0,
        pct: totalInvested > 0 ? (total / totalInvested) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
});

export const getDownloadData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({context}) => {
    await requireAdmin(context);
    return loadAll(true);
  });

export const getBillCauses = createServerFn({ method: "GET" }).handler(async () => {
  const t = await readTabs(["bill_causes"]);
  return t.bill_causes;
});

// ---------- Authenticated reads ----------

export const getRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const t = await loadAll();
    return t.requests
      .map((r) => {
        let parsed: Row = {};
        try {
          parsed = v(r, "data") ? JSON.parse(v(r, "data")) : {};
        } catch {
          parsed = {};
        }
        return { ...r, parsed, fromName: profileName(t.profiles, v(r, "from_user_id")) } as Row & { parsed: Row; fromName: string };
      })
      .sort((a, b) => (b["created_at"] ?? "").localeCompare(a["created_at"] ?? ""));
  });

// ---------- Mutations ----------

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("অনুমতি নেই");
}

async function myProfileId(context: { supabase: any; userId: string }): Promise<string> {
  const { data } = await context.supabase
    .from("profiles")
    .select("id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data) throw new Error("প্রোফাইল পাওয়া যায়নি");
  return data.id;
}

export const submitInvestmentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        amount: z.number().positive(),
        method: z.string().min(1),
        txnId: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const profileId = await myProfileId(context);
    await appendRow("requests", {
      id: newId(),
      type: "invest",
      status: "pending",
      from_user_id: profileId,
      to_user_id: "",
      project_id: "",
      data: JSON.stringify({ amount: data.amount, method: data.method, txnId: data.txnId ?? "" }),
      created_at: nowIso(),
      resolved_at: "",
      resolved_by: "",
    });
    return { ok: true };
  });

export const reviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string(), decision: z.enum(["approved", "rejected"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const t = await readTabs(["requests"], true);
    const req = t.requests.find((r) => v(r, "id") === data.id);
    if (!req) throw new Error("অনুরোধ পাওয়া যায়নি");
    if (v(req, "status") !== "pending") throw new Error("অনুরোধটি ইতিমধ্যে সমাধান করা হয়েছে");

    if (data.decision === "approved" && v(req, "type") === "invest") {
      let parsed: Row = {};
      try {
        parsed = JSON.parse(v(req, "data") || "{}");
      } catch {
        parsed = {};
      }
      await appendRow("investments", {
        id: newId(),
        investor_id: v(req, "from_user_id"),
        amount: String(num(v(parsed, "amount"))),
        date: nowIso().slice(0, 10),
        created_at: nowIso(),
      });
    }
    await updateRow("requests", data.id, {
      status: data.decision,
      resolved_at: nowIso(),
      resolved_by: context.userId,
    });
    invalidateAll();
    return { ok: true };
  });

export const addCashout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        investorId: z.string().min(1),
        amount: z.number().positive(),
        date: z.string().min(1),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await appendRow("cashouts", {
      id: newId(),
      investor_id: data.investorId,
      amount: String(data.amount),
      date: data.date,
      note: data.note ?? "",
      created_at: nowIso(),
    });
    return { ok: true };
  });

export const addProjectStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        projectId: z.string(),
        reason: z.string().min(1),
        amount: z.number().positive(),
        date: z.string().min(1),
        notes: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await appendRow("project_steps", {
      id: newId(),
      project_id: data.projectId,
      reason: data.reason,
      amount: String(data.amount),
      proof_images: "",
      date: data.date,
      created_at: nowIso(),
      notes: data.notes ?? "",
      updated_at: "",
    });
    return { ok: true };
  });

export const addProjectSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        projectId: z.string(),
        name: z.string().min(1),
        amount: z.number().positive(),
        date: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await appendRow("project_sales", {
      id: newId(),
      project_id: data.projectId,
      name: data.name,
      amount: String(data.amount),
      date: data.date,
      created_at: nowIso(),
      updated_at: "",
    });
    return { ok: true };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(1),
        estimatedInvestment: z.number().nonnegative(),
        estimatedProfit: z.number().nonnegative().optional(),
        description: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const id = newId();
    await appendRow("projects", {
      id,
      name: data.name,
      estimated_investment: String(data.estimatedInvestment),
      estimated_profit: data.estimatedProfit != null ? String(data.estimatedProfit) : "",
      actual_profit: "",
      status: "active",
      images: "",
      started_at: nowIso(),
      completed_at: "",
      created_at: nowIso(),
      updated_at: "",
      notes: "",
      manager_id: "",
      description: data.description ?? "",
    });
    return { ok: true, id };
  });

export const completeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ projectId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const t = await readTabs(["projects", "project_steps", "project_sales", "investments"], true);
    const project = t.projects.find((p) => v(p, "id") === data.projectId);
    if (!project) throw new Error("প্রকল্প পাওয়া যায়নি");
    if (v(project, "status") !== "active") throw new Error("প্রকল্পটি সক্রিয় নয়");

    const spent = t.project_steps
      .filter((s) => v(s, "project_id") === v(project, "id"))
      .reduce((a, s) => a + num(v(s, "amount")), 0);
    const sold = t.project_sales
      .filter((s) => v(s, "project_id") === v(project, "id"))
      .reduce((a, s) => a + num(v(s, "amount")), 0);
    const profit = sold - spent;

    // Lock each investor's share of the fund at completion time.
    const totalInvested = t.investments.reduce((s, r) => s + num(v(r, "amount")), 0);
    const byInvestor = new Map<string, number>();
    for (const inv of t.investments) {
      const id = v(inv, "investor_id");
      byInvestor.set(id, (byInvestor.get(id) ?? 0) + num(v(inv, "amount")));
    }
    for (const [investorId, total] of byInvestor) {
      const pct = totalInvested > 0 ? (total / totalInvested) * 100 : 0;
      const snapshotId = newId();
      await appendRow("percentage_snapshots", {
        id: snapshotId,
        project_id: v(project, "id"),
        investor_id: investorId,
        percentage: String(pct),
        locked_amount: String(total),
        created_at: nowIso(),
      });
      await appendRow("profit_distributions", {
        id: newId(),
        project_id: v(project, "id"),
        investor_id: investorId,
        snapshot_id: snapshotId,
        status: "pending",
        profit_amount: String((profit * pct) / 100),
        locked_amount: String(total),
        notes: "",
        resolved_at: "",
        created_at: nowIso(),
      });
    }
    await updateRow("projects", v(project, "id"), {
      status: "completed",
      actual_profit: String(profit),
      completed_at: nowIso(),
      updated_at: nowIso(),
    });
    invalidateAll();
    return { ok: true, profit };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ projectId: z.string(), message: z.string().min(1).max(2000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const profileId = await myProfileId(context);
    await appendRow("chat_messages", {
      id: newId(),
      project_id: data.projectId,
      sender_id: profileId,
      message: data.message,
      created_at: nowIso(),
    });
    return { ok: true };
  });

export const addBillCause = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ name: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await appendRow("bill_causes", { id: newId(), name: data.name, created_at: nowIso() });
    return { ok: true };
  });
