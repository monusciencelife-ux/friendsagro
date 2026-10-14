// Auth server functions: login resolution, admin user creation, bootstrap.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYNTHETIC_DOMAIN = "villageagro.local";

function looksLikeEmail(v: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

function phoneToEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@${SYNTHETIC_DOMAIN}`;
}

/** Resolve a login identifier (email or phone) to the account email. Public. */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ identifier: z.string().min(3) }).parse(data))
  .handler(async ({ data }) => {
    const id = data.identifier.trim();
    if (looksLikeEmail(id)) return { email: id };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("phone", id.replace(/[^0-9]/g, ""))
      .maybeSingle();
    if (!profile?.user_id) throw new Error("এই নম্বরে কোনো অ্যাকাউন্ট নেই");
    const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    if (error || !userData.user?.email) throw new Error("অ্যাকাউন্ট পাওয়া যায়নি");
    return { email: userData.user.email };
  });

/** One-time setup: create the first admin account. Disabled once an admin exists. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        password: z.string().min(6),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("user_roles").select("id").eq("role", "admin").limit(1);
    if (existing && existing.length > 0) throw new Error("অ্যাডমিন ইতিমধ্যে আছে");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const userId = created.user.id;
    await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      name: data.name,
      phone: (data.phone ?? "").replace(/[^0-9]/g, ""),
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    return { ok: true };
  });

export const setupNeeded = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("id").eq("role", "admin").limit(1);
  return { needed: !data || data.length === 0 };
});

/** Admin creates an investor account (name + phone + password), like the original app. */
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(1),
        phone: z.string().min(6),
        password: z.string().min(6),
        makeAdmin: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("অনুমতি নেই");

    const phone = data.phone.replace(/[^0-9]/g, "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dup } = await supabaseAdmin.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (dup) throw new Error("এই ফোন নম্বরে ইতিমধ্যে একটি অ্যাকাউন্ট আছে");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: phoneToEmail(phone),
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const userId = created.user.id;
    await supabaseAdmin.from("profiles").insert({ user_id: userId, name: data.name, phone });
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.makeAdmin ? "admin" : "investor" });
    return { ok: true };
  });

/** List registered users (admin). */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("অনুমতি নেই");
    const { data } = await context.supabase
      .from("profiles")
      .select("id, name, phone, created_at")
      .order("created_at", { ascending: true });
    return data ?? [];
  });

/** Signed-in user changes their own password. */
export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.auth.updateUser({
      password: data.newPassword,
      current_password: data.currentPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Current session info for the nav: name + admin flag. */
export const getMySessionInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, name, phone")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { profile, isAdmin: !!isAdmin };
  });
