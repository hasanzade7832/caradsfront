"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { X, Eye, EyeOff } from "lucide-react";

export type UserRoleKey = "User" | "Admin";

export type UserForm = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  role: UserRoleKey;
};

export default function UserModal({
  open,
  onOpenChange,
  onSubmit,
  initialValue,
  mode = "create",
  canManageUsers = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: UserForm) => Promise<void> | void;
  initialValue?: Partial<UserForm>;
  mode?: "create" | "edit";
  canManageUsers?: boolean;
}) {
  const empty: UserForm = {
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    email: "",
    password: "",
    role: "User",
  };

  const [form, setForm] = useState<UserForm>(empty);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!open) return;

    const init: UserForm = {
      ...empty,
      ...(initialValue ?? {}),
      role: (initialValue?.role ?? "User") as UserRoleKey,
      password: mode === "edit" ? "" : initialValue?.password ?? "",
    };

    setForm(init);
    setShowPass(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue, mode]);

  function set<K extends keyof UserForm>(key: K, val: UserForm[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function clean(v?: string | null) {
    return String(v ?? "").trim();
  }

  function validate(): { ok: boolean; msg?: string } {
    if (!canManageUsers) return { ok: false, msg: "دسترسی ندارید." };

    if (!clean(form.firstName)) return { ok: false, msg: "نام الزامی است." };
    if (!clean(form.lastName))
      return { ok: false, msg: "نام خانوادگی الزامی است." };
    if (!clean(form.username))
      return { ok: false, msg: "نام کاربری الزامی است." };
    if (!clean(form.phone)) return { ok: false, msg: "شماره تماس الزامی است." };
    if (clean(form.phone).length < 10)
      return { ok: false, msg: "شماره تماس معتبر نیست." };
    if (!clean(form.email)) return { ok: false, msg: "ایمیل الزامی است." };

    if (mode === "create") {
      if (!clean(form.password))
        return { ok: false, msg: "رمز عبور الزامی است." };
      if (clean(form.password).length < 6)
        return { ok: false, msg: "رمز عبور حداقل ۶ کاراکتر باشد." };
    } else {
      // edit: password optional
      if (clean(form.password) && clean(form.password).length < 6) {
        return {
          ok: false,
          msg: "اگر رمز عبور وارد می‌کنید، حداقل ۶ کاراکتر باشد.",
        };
      }
    }

    return { ok: true };
  }

  async function submit() {
    const v = validate();
    if (!v.ok) {
      toast.error(v.msg ?? "فرم معتبر نیست");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        firstName: clean(form.firstName),
        lastName: clean(form.lastName),
        username: clean(form.username),
        phone: clean(form.phone),
        email: clean(form.email),
        password: clean(form.password),
        role: form.role,
      });

      onOpenChange(false);
    } catch (e: any) {
      toast.error("عملیات ناموفق بود", {
        description: e?.response?.data ?? "لطفاً دوباره تلاش کنید.",
      });
    } finally {
      setLoading(false);
    }
  }

  // ✅ گرادیانت قوی‌تر
  const softGradient = useMemo(() => {
    return "linear-gradient(90deg, rgba(34,197,94,.72), rgba(56,189,248,.64), rgba(217,70,239,.58))";
  }, []);

  const surfaceBg = useMemo(() => {
    return "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)";
  }, []);

  const inputWrap =
    "rounded-2xl border h-12 flex items-center px-4 " +
    "transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm";

  const roleBtnBase =
    "h-11 w-full rounded-2xl border text-sm font-semibold " +
    "transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md " +
    "active:translate-y-0 active:shadow-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("p-0 overflow-hidden w-[94vw] max-w-[880px]")}
        style={{
          borderRadius: 28,
          borderColor: "hsl(var(--border))",
          background: surfaceBg,
        }}
      >
        {/* ✅ برای رفع ارور DialogTitle ولی بدون نمایش هدر */}
        <VisuallyHidden>
          <DialogTitle>
            {mode === "edit" ? "ویرایش کاربر" : "افزودن کاربر"}
          </DialogTitle>
        </VisuallyHidden>

        {/* Top color bar */}
        <div className="h-1.5 w-full" style={{ background: softGradient }} />

        {/* Close only (بدون هدر/عنوان) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute left-4 top-4 z-20 h-10 w-10 rounded-2xl border grid place-items-center cursor-pointer transition hover:scale-105"
            style={{
              borderColor: "hsl(var(--border))",
              background: "hsl(var(--background))",
            }}
            aria-label="بستن"
            title="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 pt-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Field label="نام *">
              <Input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="rounded-2xl h-12"
                placeholder="مثلاً محمد"
                disabled={!canManageUsers || loading}
              />
            </Field>

            <Field label="نام خانوادگی *">
              <Input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="rounded-2xl h-12"
                placeholder="مثلاً رضایی"
                disabled={!canManageUsers || loading}
              />
            </Field>

            <Field label="نام کاربری *">
              <Input
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                className="rounded-2xl h-12"
                placeholder="مثلاً ali_admin"
                disabled={!canManageUsers || loading}
              />
            </Field>

            <Field label="شماره تماس *">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="rounded-2xl h-12"
                placeholder="مثلاً 09123456789"
                disabled={!canManageUsers || loading}
              />
            </Field>

            <Field label="ایمیل *">
              <Input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="rounded-2xl h-12"
                placeholder="مثلاً test@gmail.com"
                disabled={!canManageUsers || loading}
              />
            </Field>

            <Field
              label={mode === "edit" ? "رمز عبور (اختیاری)" : "رمز عبور *"}
            >
              <div
                className={cn(inputWrap)}
                style={{
                  borderColor: "hsl(var(--border))",
                  background: "hsl(var(--background))",
                }}
              >
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                  placeholder={
                    mode === "edit"
                      ? "اگر نیاز بود تغییر بده..."
                      : "حداقل ۶ کاراکتر"
                  }
                  disabled={!canManageUsers || loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="h-9 w-9 rounded-xl border grid place-items-center cursor-pointer transition hover:scale-105"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                  aria-label={showPass ? "مخفی کردن رمز" : "نمایش رمز"}
                  title={showPass ? "مخفی کردن" : "نمایش"}
                  disabled={!canManageUsers || loading}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            {/* ✅ نقش کاربر: خیلی شیک + هاور گرادیانت */}
            <Field label="نقش (فعلی) *">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => set("role", "User")}
                  className={cn(roleBtnBase)}
                  disabled={!canManageUsers || loading}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background:
                      form.role === "User"
                        ? softGradient
                        : "hsl(var(--background))",
                  }}
                  onMouseEnter={(e) => {
                    if (!canManageUsers || loading) return;
                    if (form.role !== "User")
                      e.currentTarget.style.background = softGradient;
                  }}
                  onMouseLeave={(e) => {
                    if (!canManageUsers || loading) return;
                    if (form.role !== "User")
                      e.currentTarget.style.background =
                        "hsl(var(--background))";
                  }}
                >
                  User
                </button>

                <button
                  type="button"
                  onClick={() => set("role", "Admin")}
                  className={cn(roleBtnBase)}
                  disabled={!canManageUsers || loading}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background:
                      form.role === "Admin"
                        ? softGradient
                        : "hsl(var(--background))",
                  }}
                  onMouseEnter={(e) => {
                    if (!canManageUsers || loading) return;
                    if (form.role !== "Admin")
                      e.currentTarget.style.background = softGradient;
                  }}
                  onMouseLeave={(e) => {
                    if (!canManageUsers || loading) return;
                    if (form.role !== "Admin")
                      e.currentTarget.style.background =
                        "hsl(var(--background))";
                  }}
                >
                  Admin
                </button>
              </div>
            </Field>

            <div className="md:col-span-2 pt-2">
              <Button
                onClick={submit}
                disabled={!canManageUsers || loading}
                className="w-full rounded-2xl h-12 font-semibold cursor-pointer transition hover:-translate-y-[1px] hover:shadow-md"
                style={{
                  border: "1px solid hsl(var(--border))",
                  background: softGradient,
                  color: "hsl(var(--foreground))",
                }}
              >
                {loading
                  ? "در حال انجام..."
                  : mode === "edit"
                  ? "ذخیره"
                  : "ایجاد"}
              </Button>

              {!canManageUsers ? (
                <div className="mt-3 text-center text-sm text-muted-foreground">
                  فقط SuperAdmin امکان افزودن/ویرایش کاربر را دارد.
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-foreground text-right">
        {label}
      </div>
      {children}
    </div>
  );
}
