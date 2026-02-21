"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

import BioManager from "@/app/admin/BioManager";
import UserManager from "@/app/admin/UserManager"; // ✅ اضافه شد

export default function AdminPage() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isAdmin = role === "Admin" || role === "SuperAdmin";
  const isSuperAdmin = role === "SuperAdmin";

  const tabs = useMemo(
    () =>
      [
        { key: "bio" as const, label: "مدیریت بیوگرافی", show: isAdmin },
        { key: "users" as const, label: "مدیریت کاربران", show: isSuperAdmin },
      ].filter((t) => t.show),
    [isAdmin, isSuperAdmin]
  );

  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("bio");

  useEffect(() => {
    if (!tabs.find((t) => t.key === active)) {
      setActive(tabs[0]?.key ?? "bio");
    }
  }, [tabs, active]);

  // ✅ Accent gradient: لایت ملایم / دارک پررنگ‌تر (مثل Header)
  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.12), rgba(56,189,248,.10), rgba(217,70,239,.10))";
  }, [isDark]);

  const cardBg =
    "linear-gradient(180deg, color-mix(in srgb, var(--card) 94%, transparent), color-mix(in srgb, var(--card) 86%, transparent))";

  if (!mounted) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <div
            className="rounded-3xl border p-5"
            style={{ borderColor: "hsl(var(--border))", background: cardBg }}
          >
            <div className="text-sm text-muted-foreground text-center">
              در حال آماده‌سازی...
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!token) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div
            className="rounded-3xl border p-5"
            style={{ borderColor: "hsl(var(--border))", background: cardBg }}
          >
            <div className="text-foreground text-center">ابتدا وارد شوید.</div>
            <div className="mt-4 flex justify-center">
              <Link
                className="rounded-2xl px-4 py-2 text-sm border bg-background text-foreground"
                style={{ borderColor: "hsl(var(--border))" }}
                href="/login"
              >
                رفتن به ورود
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div
            className="rounded-3xl border p-5"
            style={{ borderColor: "hsl(var(--border))", background: cardBg }}
          >
            <div className="text-foreground text-center">دسترسی ندارید.</div>
            <div className="mt-2 text-xs text-muted-foreground text-center">
              نقش فعلی: <span className="font-mono">{String(role)}</span>
            </div>
            <div className="mt-4 flex justify-center">
              <Link
                className="rounded-2xl px-4 py-2 text-sm border bg-background text-foreground"
                style={{ borderColor: "hsl(var(--border))" }}
                href="/"
              >
                برگشت
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-[1650px] px-2 sm:px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-[26px] border p-3 sm:p-4"
              style={{
                borderColor: "hsl(var(--border))",
                background: cardBg,
              }}
            >
              <div className="mt-0 space-y-2">
                {tabs.map((t) => {
                  const activeNow = t.key === active;

                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActive(t.key)}
                      className={[
                        "w-full rounded-2xl border px-4 py-3",
                        "text-sm font-semibold text-right",
                        "transition-all duration-200",
                        "hover:-translate-y-[1px] hover:shadow-sm cursor-pointer",
                      ].join(" ")}
                      style={{
                        borderColor: "hsl(var(--border))",
                        background: activeNow
                          ? softGradient
                          : isDark
                          ? "hsl(0 0% 10%)"
                          : "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                      }}
                      onMouseEnter={(e) => {
                        if (activeNow) return;
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = softGradient;
                      }}
                      onMouseLeave={(e) => {
                        if (activeNow) return;
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = isDark
                          ? "hsl(0 0% 10%)"
                          : "hsl(var(--card))";
                      }}
                      onFocus={(e) => {
                        if (activeNow) return;
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = softGradient;
                      }}
                      onBlur={(e) => {
                        if (activeNow) return;
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = isDark
                          ? "hsl(0 0% 10%)"
                          : "hsl(var(--card))";
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* ✅ متن "بخش‌ها" حذف شد */}
            </motion.div>
          </aside>

          {/* Content */}
          <section className="lg:col-span-9">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.03 }}
              className="rounded-[26px] border p-4 sm:p-5 min-h-[520px]"
              style={{
                borderColor: "hsl(var(--border))",
                background: cardBg,
              }}
            >
              {active === "bio" ? (
                <BioManager embedded canManageBio={true} />
              ) : active === "users" ? (
                <UserManager canManageUsers={isSuperAdmin} />
              ) : null}
            </motion.div>
          </section>
        </div>
      </main>
    </>
  );
}
