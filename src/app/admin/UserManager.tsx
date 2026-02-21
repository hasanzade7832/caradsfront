"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

import { api } from "@/lib/api";
import UserModal, { type UserForm } from "@/app/admin/UserModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorToText } from "@/lib/errorText";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Pencil, Trash2, Search } from "lucide-react";

type AdminUserRow = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string;
  role: "User" | "Admin" | "SuperAdmin";
  createdAt?: string;
};

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeUser(raw: any): AdminUserRow {
  return {
    id: toNum(raw?.id ?? raw?.Id),
    firstName: String(raw?.firstName ?? raw?.FirstName ?? ""),
    lastName: String(raw?.lastName ?? raw?.LastName ?? ""),
    username: String(raw?.username ?? raw?.Username ?? ""),
    phone: String(raw?.phone ?? raw?.Phone ?? ""),
    email: String(raw?.email ?? raw?.Email ?? ""),
    role: (raw?.role ?? raw?.Role ?? "User") as any,
    createdAt: raw?.createdAt ?? raw?.CreatedAt ?? undefined,
  };
}

function clean(v?: string | null) {
  return String(v ?? "").trim();
}

export default function UserManager({
  canManageUsers = false,
  embedded = false,
}: {
  canManageUsers?: boolean;
  embedded?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);

  // سرچ لحظه‌ای
  const [q, setQ] = useState("");
  const debounceRef = useRef<any>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);

  // ✅ گرادیانت هماهنگ با Header (دارک پررنگ‌تر)
  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.12), rgba(56,189,248,.10), rgba(217,70,239,.10))";
  }, [isDark]);

  const btnMotion =
    "cursor-pointer rounded-2xl border " +
    "transition-all duration-200 ease-out " +
    "hover:-translate-y-[1px] hover:scale-[1.02] hover:shadow-md " +
    "active:translate-y-0 active:scale-100 active:shadow-sm";

  function rolePill(role: AdminUserRow["role"]) {
    const base =
      "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold";
    if (role === "SuperAdmin")
      return (
        <span
          className={`${base}`}
          style={{
            borderColor: "hsl(var(--border))",
            background: isDark
              ? "linear-gradient(90deg, rgba(236,72,153,.34), rgba(56,189,248,.22), rgba(217,70,239,.22))"
              : "linear-gradient(90deg, rgba(236,72,153,.14), rgba(56,189,248,.10), rgba(217,70,239,.10))",
          }}
        >
          SuperAdmin
        </span>
      );
    if (role === "Admin")
      return (
        <span
          className={`${base}`}
          style={{
            borderColor: "hsl(var(--border))",
            background: isDark
              ? "linear-gradient(90deg, rgba(245,158,11,.30), rgba(56,189,248,.22), rgba(34,197,94,.22))"
              : "linear-gradient(90deg, rgba(245,158,11,.14), rgba(56,189,248,.10), rgba(34,197,94,.10))",
          }}
        >
          Admin
        </span>
      );

    return (
      <span
        className={`${base}`}
        style={{
          borderColor: "hsl(var(--border))",
          background: isDark
            ? "linear-gradient(90deg, rgba(34,197,94,.24), rgba(56,189,248,.18), rgba(217,70,239,.18))"
            : "linear-gradient(90deg, rgba(34,197,94,.12), rgba(56,189,248,.08), rgba(217,70,239,.08))",
        }}
      >
        User
      </span>
    );
  }

  async function load(queryValue?: string) {
    setLoading(true);
    try {
      const qq = (queryValue ?? q).trim();
      const res = await api.get("/api/admin/users", {
        params: qq ? { q: qq } : undefined,
      });
      const list = (res.data ?? []) as any[];
      setItems(list.map(normalizeUser));
    } catch (e: any) {
      setItems([]);
      toast.error("خطا در دریافت کاربران", {
        description: errorToText(e),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ سرچ لحظه‌ای با Debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(q);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const title = useMemo(() => "مدیریت کاربران (فقط SuperAdmin)", []);

  function openCreate() {
    if (!canManageUsers) {
      toast.error("دسترسی ندارید", {
        description: "فقط SuperAdmin امکان افزودن کاربر را دارد.",
      });
      return;
    }
    setEditing(null);
    setOpen(true);
  }

  function openEdit(u: AdminUserRow) {
    if (!canManageUsers) {
      toast.error("دسترسی ندارید", {
        description: "فقط SuperAdmin امکان ویرایش کاربر را دارد.",
      });
      return;
    }
    setEditing(u);
    setOpen(true);
  }

  async function removeUser(u: AdminUserRow) {
    if (!canManageUsers) {
      toast.error("دسترسی ندارید", {
        description: "فقط SuperAdmin امکان حذف کاربر را دارد.",
      });
      return;
    }

    const ok = window.confirm(
      `حذف کاربر "${u.firstName} ${u.lastName}" (${u.username}) انجام شود؟`
    );
    if (!ok) return;

    toast.loading("در حال حذف کاربر...", { id: "user-del" });
    try {
      await api.delete(`/api/admin/users/${u.id}`);
      toast.success("کاربر حذف شد ✅", { id: "user-del" });
      await load(q);
    } catch (e: any) {
      toast.error("حذف ناموفق بود", {
        id: "user-del",
        description: errorToText(e),
      });
    }
  }

  async function handleSubmit(payload: UserForm) {
    if (!canManageUsers) {
      toast.error("دسترسی ندارید", {
        description: "فقط SuperAdmin امکان انجام این عملیات را دارد.",
      });
      return;
    }

    // create
    if (!editing) {
      await api.post("/api/admin/users", {
        FirstName: clean(payload.firstName),
        LastName: clean(payload.lastName),
        Username: clean(payload.username),
        Phone: clean(payload.phone),
        Email: clean(payload.email),
        Password: clean(payload.password),
        Role: payload.role, // "User" | "Admin"
      });
      await load(q);
      return;
    }

    // edit (UpdateUserDto)
    await api.put(`/api/admin/users/${editing.id}`, {
      FirstName: clean(payload.firstName),
      LastName: clean(payload.lastName),
      Username: clean(payload.username),
      Phone: clean(payload.phone),
      Email: clean(payload.email),
    });

    // change role (optional endpoint)
    const prevRole = editing.role === "Admin" ? "Admin" : "User";
    const nextRole = payload.role === "Admin" ? "Admin" : "User";
    if (prevRole !== nextRole) {
      await api.put(`/api/admin/users/${editing.id}/role`, {
        Role: nextRole,
      });
    }

    await load(q);
  }

  const initialValue = editing
    ? {
        firstName: editing.firstName,
        lastName: editing.lastName,
        username: editing.username,
        phone: editing.phone,
        email: editing.email,
        role: (editing.role === "Admin" ? "Admin" : "User") as any,
      }
    : undefined;

  return (
    <section
      className={[
        "rounded-3xl p-4",
        embedded ? "" : "border border-border bg-card",
      ].join(" ")}
      style={{
        borderColor: embedded ? "transparent" : "hsl(var(--border))",
        background: embedded
          ? "transparent"
          : isDark
          ? "hsl(0 0% 8%)"
          : "hsl(var(--card))",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-foreground">{title}</div>

        <Button
          onClick={openCreate}
          disabled={!canManageUsers}
          variant="outline"
          className={[
            btnMotion,
            "bg-card border-border",
            !canManageUsers ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
          style={{
            background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
          onMouseEnter={(e) => {
            if (!canManageUsers) return;
            (e.currentTarget as HTMLButtonElement).style.background =
              softGradient;
          }}
          onMouseLeave={(e) => {
            if (!canManageUsers) return;
            (e.currentTarget as HTMLButtonElement).style.background = isDark
              ? "hsl(0 0% 10%)"
              : "hsl(var(--card))";
          }}
        >
          + افزودن کاربر
        </Button>
      </div>

      {!canManageUsers ? (
        <div
          className="mt-3 rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{
            borderColor: "hsl(var(--border))",
            background: isDark
              ? "linear-gradient(90deg, rgba(236,72,153,.26), rgba(56,189,248,.16), rgba(217,70,239,.16))"
              : "linear-gradient(90deg, rgba(236,72,153,.12), rgba(56,189,248,.08), rgba(217,70,239,.08))",
          }}
        >
          فقط SuperAdmin امکان افزودن/ویرایش/حذف کاربران را دارد.
        </div>
      ) : null}

      {/* Search Bar (Live) */}
      <div className="mt-4">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو: نام، نام‌کاربری، موبایل، ایمیل..."
            className="rounded-2xl h-12 pr-11"
          />
        </div>
      </div>

      <UserModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        onSubmit={handleSubmit}
        initialValue={initialValue}
        mode={editing ? "edit" : "create"}
        canManageUsers={canManageUsers}
      />

      {/* Table */}
      <div
        className="mt-4 rounded-3xl border overflow-hidden"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">نام</TableHead>
              <TableHead className="text-right">نام‌کاربری</TableHead>
              <TableHead className="text-right">موبایل</TableHead>
              <TableHead className="text-right">ایمیل</TableHead>
              <TableHead className="text-right">نقش</TableHead>
              <TableHead className="text-center w-[120px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  در حال بارگذاری...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  کاربری یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              items.map((u, idx) => (
                <TableRow key={u.id}>
                  <TableCell className="text-right">
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.18,
                        delay: Math.min(idx * 0.02, 0.2),
                      }}
                      className="font-semibold text-foreground"
                    >
                      {u.firstName} {u.lastName}
                    </motion.div>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-mono text-sm">{u.username}</span>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-mono text-sm">{u.phone}</span>
                  </TableCell>

                  <TableCell className="text-right break-words">
                    {u.email}
                  </TableCell>

                  <TableCell className="text-right">
                    {rolePill(u.role)}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Edit icon (yellow) */}
                      <button
                        type="button"
                        disabled={!canManageUsers}
                        onClick={() => openEdit(u)}
                        className={[
                          "h-10 w-10 rounded-2xl grid place-items-center",
                          btnMotion,
                          !canManageUsers
                            ? "opacity-50 cursor-not-allowed"
                            : "",
                        ].join(" ")}
                        style={{
                          borderColor: "hsl(var(--border))",
                          background: isDark
                            ? "color-mix(in srgb, rgb(250 204 21) 26%, rgba(255,255,255,.08) 74%)"
                            : "color-mix(in srgb, rgb(250 204 21) 18%, hsl(var(--muted)) 82%)",
                        }}
                        aria-label="ویرایش"
                        title="ویرایش"
                      >
                        <Pencil className="h-4 w-4 text-yellow-600" />
                      </button>

                      {/* Trash icon (red) */}
                      <button
                        type="button"
                        disabled={!canManageUsers}
                        onClick={() => removeUser(u)}
                        className={[
                          "h-10 w-10 rounded-2xl grid place-items-center",
                          btnMotion,
                          !canManageUsers
                            ? "opacity-50 cursor-not-allowed"
                            : "",
                        ].join(" ")}
                        style={{
                          borderColor: "hsl(var(--border))",
                          background: isDark
                            ? "color-mix(in srgb, rgb(239 68 68) 22%, rgba(255,255,255,.08) 78%)"
                            : "color-mix(in srgb, rgb(239 68 68) 16%, hsl(var(--muted)) 84%)",
                        }}
                        aria-label="حذف"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
