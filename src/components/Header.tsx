"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useTheme } from "next-themes";

import { motion } from "framer-motion";
import {
  CarFront,
  LogOut,
  Shield,
  LayoutDashboard,
  Loader2,
  Sparkles,
} from "lucide-react";

type BioItem = {
  id: number;
  userId?: number;
  title?: string;
  description?: string;
  isAdvanced?: boolean;
  contactInfo?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function roleLabel(role?: string | null) {
  if (!role) return "";
  if (role === "SuperAdmin") return "Super Admin";
  if (role === "Admin") return "Admin";
  return "User";
}

function parseAdvancedLegacy(
  description?: string
): { person: string; contact: string } | null {
  const raw = String(description ?? "").trim();
  if (!raw) return null;

  if (raw.includes("|")) {
    const parts = raw.split("|").map((s) => s.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { person: parts[0], contact: parts[1] };
    }
  }

  const dash = raw.includes(" - ") ? " - " : raw.includes(" – ") ? " – " : null;
  if (dash) {
    const parts = raw.split(dash).map((s) => s.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { person: parts[0], contact: parts[1] };
    }
  }

  return null;
}

export default function Header() {
  const router = useRouter();
  const { token, role, clear } = useAuthStore();
  const isAdmin = role === "Admin" || role === "SuperAdmin";

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  const [loggingOut, setLoggingOut] = useState(false);

  // (برای اینکه state اضافی بعد از خروج مزاحم نشه)
  const [bioItems, setBioItems] = useState<BioItem[]>([]);
  const [bioLoading, setBioLoading] = useState(false);

  const headerBg = useMemo(() => {
    const main = isDark
      ? "linear-gradient(90deg, rgba(16,185,129,.40) 0%, rgba(56,189,248,.36) 45%, rgba(217,70,239,.32) 100%)"
      : "linear-gradient(90deg, rgba(16,185,129,.28) 0%, rgba(56,189,248,.24) 45%, rgba(217,70,239,.20) 100%)";

    const base = isDark
      ? "linear-gradient(180deg, rgba(10,10,10,1) 0%, rgba(12,12,12,1) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(252,252,252,1) 100%)";

    const sheen = isDark
      ? "radial-gradient(900px 180px at 50% 0%, rgba(255,255,255,.08) 0%, rgba(255,255,255,0) 60%)"
      : "radial-gradient(900px 200px at 50% 0%, rgba(0,0,0,.05) 0%, rgba(0,0,0,0) 62%)";

    return `${sheen}, ${main}, ${base}`;
  }, [isDark]);

  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.22), rgba(56,189,248,.18), rgba(217,70,239,.16))";
  }, [isDark]);

  const softGradient2 = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(56,189,248,.52), rgba(217,70,239,.44), rgba(34,197,94,.48))"
      : "linear-gradient(90deg, rgba(56,189,248,.20), rgba(217,70,239,.16), rgba(34,197,94,.18))";
  }, [isDark]);

  const dangerGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(239,68,68,.50), rgba(56,189,248,.22), rgba(217,70,239,.20))"
      : "linear-gradient(90deg, rgba(239,68,68,.28), rgba(56,189,248,.16), rgba(217,70,239,.12))";
  }, [isDark]);

  const roleTextColor = isDark ? "#ffffff" : "#0a0a0a";

  const btnBase =
    "rounded-2xl border px-4 h-10 text-sm font-semibold select-none " +
    "transition-all duration-200 " +
    "cursor-pointer hover:-translate-y-[1px] hover:shadow-md active:translate-y-0";

  const menuItemBase =
    "w-full rounded-2xl px-3 py-2 text-sm font-semibold flex items-center gap-2 " +
    "cursor-pointer select-none outline-none transition-all " +
    "hover:-translate-y-[1px] hover:shadow-sm";

  // ✅ خروج بدون خطا: FULL RELOAD بعد از clear
  const handleLogout = useCallback(() => {
    if (loggingOut) return;

    setLoggingOut(true);
    setBioItems([]);
    setBioLoading(false);

    setTimeout(() => {
      try {
        clear();
      } finally {
        // ✅ مهم‌ترین قسمت برای حذف خطای hooks:
        window.location.replace("/");
      }
    }, 0);
  }, [clear, loggingOut]);

  return (
    <div className="sticky top-0 z-50">
      {/* ✅ Logout overlay */}
      {loggingOut ? (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/55">
          <div
            className="w-[92vw] max-w-[420px] rounded-3xl border p-5 text-center"
            style={{
              borderColor: "hsl(var(--border))",
              background: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
            }}
          >
            <div
              className="mx-auto h-12 w-12 rounded-2xl grid place-items-center border"
              style={{
                borderColor: "hsl(var(--border))",
                background: softGradient,
              }}
            >
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div
              className="mt-4 text-base font-semibold"
              style={{ color: roleTextColor }}
            >
              در حال خروج...
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              لطفاً چند لحظه صبر کنید
            </div>
          </div>
        </div>
      ) : null}

      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="border-b"
        style={{
          borderColor: "hsl(var(--border))",
          background: headerBg,
        }}
        suppressHydrationWarning
      >
        <div className="mx-auto max-w-[1650px] px-2 sm:px-4 py-3 flex items-center justify-between gap-3">
          {/* LEFT: Logo + Keyvan */}
          <motion.div
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <button
              type="button"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              className="group flex items-center gap-2 select-none cursor-pointer"
              aria-label="صفحه اصلی"
              title="صفحه اصلی"
            >
              <span className="relative">
                <span
                  className="absolute -inset-1 rounded-3xl opacity-0 blur-[7px] group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: softGradient }}
                />
                <span
                  className="relative h-10 w-10 rounded-2xl grid place-items-center border shadow-sm"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: softGradient,
                  }}
                >
                  <CarFront className="h-5 w-5" />
                </span>
              </span>

              <span className="flex flex-col items-start leading-tight">
                <span
                  className="text-sm sm:text-base font-extrabold tracking-tight"
                  style={{ color: roleTextColor }}
                >
                  Keyvan
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 opacity-80" />
                  Car Marketplace
                </span>
              </span>
            </button>
          </motion.div>

          {/* CENTER: role pill */}
          <div className="flex-1 flex justify-center">
            {token ? (
              <div
                className={cn(
                  "px-5 py-2 rounded-2xl border text-sm sm:text-base font-semibold",
                  "transition-all duration-200"
                )}
                style={{
                  borderColor: "hsl(var(--border))",
                  background: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
                  color: roleTextColor,
                }}
              >
                {roleLabel(role)}
              </div>
            ) : null}
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2">
            {!token ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className={cn(btnBase, "relative overflow-hidden")}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  <span
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200"
                    style={{ background: softGradient }}
                  />
                  <span className="relative z-10">ورود</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className={cn(btnBase, "relative overflow-hidden")}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  <span
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200"
                    style={{ background: softGradient2 }}
                  />
                  <span className="relative z-10">ثبت‌نام</span>
                </button>

                {/* ✅ theme toggle سمت چپ ثبت‌نام */}
                <ThemeToggle />
              </>
            ) : (
              <>
                <ThemeToggle />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-2xl border bg-card cursor-pointer"
                      style={{
                        borderColor: "hsl(var(--border))",
                        background: isDark
                          ? "hsl(0 0% 10%)"
                          : "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      حساب کاربری
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-60 p-2 border shadow-lg rounded-2xl"
                    style={{
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      borderColor: "hsl(var(--border))",
                      backdropFilter: "none",
                      WebkitBackdropFilter: "none",
                      opacity: 1,
                    }}
                  >
                    <DropdownMenuItem asChild className="p-0">
                      <Link
                        href="/dashboard"
                        className={cn(menuItemBase)}
                        style={{
                          border: "1px solid transparent",
                          background: "hsl(var(--background))",
                        }}
                      >
                        <LayoutDashboard className="h-4 w-4 opacity-80" />
                        داشبورد
                      </Link>
                    </DropdownMenuItem>

                    {isAdmin ? (
                      <DropdownMenuItem asChild className="p-0">
                        <Link
                          href="/admin"
                          className={cn(menuItemBase)}
                          style={{
                            border: "1px solid transparent",
                            background: "hsl(var(--background))",
                          }}
                        >
                          <Shield className="h-4 w-4 opacity-80" />
                          پنل مدیریت
                        </Link>
                      </DropdownMenuItem>
                    ) : null}

                    <DropdownMenuSeparator />

                    {/* ✅ onSelect برای Radix (مهم) */}
                    <DropdownMenuItem
                      className={cn(menuItemBase, "text-destructive")}
                      style={{
                        border: "1px solid transparent",
                        background: "hsl(var(--background))",
                        backgroundImage: dangerGradient,
                      }}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleLogout();
                      }}
                      disabled={loggingOut}
                    >
                      <LogOut className="h-4 w-4" />
                      خروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </motion.header>
    </div>
  );
}
