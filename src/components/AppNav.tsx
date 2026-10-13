import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMySessionInfo } from "@/lib/auth.functions";
import { useQueryClient } from "@tanstack/react-query";

type SessionInfo = { profile: { name: string } | null; isAdmin: boolean } | null;

export function AppNav() {
  const [session, setSession] = useState<SessionInfo>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        setSignedIn(false);
        setSession(null);
        return;
      }
      setSignedIn(true);
      try {
        const info = await getMySessionInfo();
        if (mounted) setSession(info);
      } catch {
        if (mounted) setSession(null);
      }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const links = [
    { to: "/", label: "হোম" },
    { to: "/projects", label: "প্রকল্প" },
    { to: "/investors", label: "বিনিয়োগকারী" },
    { to: "/download", label: "ডাউনলোড" },
  ] as const;
  const adminLinks = [
    { to: "/requests", label: "অনুরোধ" },
    { to: "/admin/cashout", label: "ক্যাশআউট" },
    { to: "/admin", label: "সেটিংস" },
  ] as const;

  const linkCls = (to: string) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      pathname === to
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          Village Agro
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={linkCls(l.to)}>
              {l.label}
            </Link>
          ))}
          {signedIn && session?.isAdmin &&
            adminLinks.map((l) => (
              <Link key={l.to} to={l.to} className={linkCls(l.to)}>
                {l.label}
              </Link>
            ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="h-3.5 w-3.5" /> লগআউট
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              লগইন
            </Link>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="মেনু"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={linkCls(l.to)} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          {signedIn && session?.isAdmin &&
            adminLinks.map((l) => (
              <Link key={l.to} to={l.to} className={linkCls(l.to)} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          {signedIn ? (
            <button
              onClick={() => {
                setOpen(false);
                handleSignOut();
              }}
              className="rounded-lg px-3 py-1.5 text-left text-sm font-medium text-muted-foreground hover:bg-accent/60"
            >
              লগআউট
            </button>
          ) : (
            <Link
              to="/login"
              className={linkCls("/login")}
              onClick={() => setOpen(false)}
            >
              লগইন
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
