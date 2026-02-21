"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { errorToText } from "@/lib/errorText";
import { useTheme } from "next-themes";

dayjs.extend(jalaliday);

export type CarAdType = "UsedSale" | "CoopSale" | "BuyRequest" | "ZeroSale";
export type GearboxType = "Automatic" | "Manual";

export type AddAdPayload = {
  type: CarAdType;
  title: string;
  year: number | "";
  color: string;
  mileageKm: number | "";
  insuranceMonths: number | "";
  gearbox: GearboxType | "";
  chassisNumber: string;
  contactPhone: string;
  price: number | "";
  description: string;
};

const tabs: { key: CarAdType; label: string }[] = [
  { key: "UsedSale", label: "فروش کارکرده" },
  { key: "CoopSale", label: "فروش همکاری" },
  { key: "BuyRequest", label: "درخواست خرید" },
  { key: "ZeroSale", label: "فروش صفر" },
];

function todayJalali() {
  return dayjs().calendar("jalali").locale("fa").format("YYYY/MM/DD");
}
function hintYear() {
  return "مثلاً 1401 یا 2018";
}
function hintPrice() {
  return "مثلاً 80 یا 2500 یا 120.5";
}

function toFaNum(input: string) {
  return input;
}

/**
 * ورودی: عدد بر اساس «میلیون تومان»
 * خروجی: متن معادل با پشتیبانی از «میلیارد / میلیون / هزار تومان»
 * مثال:
 * 80 => ۸۰ میلیون تومان
 * 120.5 => ۱۲۰ میلیون و ۵۰۰ هزار تومان
 * 2000 => ۲ میلیارد تومان
 * 2500 => ۲ میلیارد و ۵۰۰ میلیون تومان
 * 2500.75 => ۲ میلیارد و ۵۰۰ میلیون و ۷۵۰ هزار تومان
 */
function formatFromMillionInput(v: number): string {
  if (!Number.isFinite(v)) return "";

  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);

  const billion = Math.floor(abs / 1000);
  const remAfterBillion = abs - billion * 1000;

  const million = Math.floor(remAfterBillion);
  const frac = remAfterBillion - million;

  // 0.001 میلیون = 1000 تومان
  let thousand = Math.round(frac * 1000);

  // رُند ممکنه هزار رو 1000 کنه => یک میلیون اضافه شود
  let millionAdj = million;
  let billionAdj = billion;

  if (thousand >= 1000) {
    thousand -= 1000;
    millionAdj += 1;
  }
  if (millionAdj >= 1000) {
    // یک میلیارد اضافه شود
    const extraB = Math.floor(millionAdj / 1000);
    billionAdj += extraB;
    millionAdj = millionAdj - extraB * 1000;
  }

  const parts: string[] = [];

  if (billionAdj > 0) {
    parts.push(`${billionAdj.toLocaleString("fa-IR")} میلیارد`);
  }

  if (millionAdj > 0) {
    parts.push(`${millionAdj.toLocaleString("fa-IR")} میلیون`);
  }

  if (thousand > 0) {
    parts.push(`${thousand.toLocaleString("fa-IR")} هزار تومان`);
  }

  if (parts.length === 0) return "۰ تومان";

  // اگر آخرین بخش «تومان» نداشت، یک «تومان» آخر اضافه کن
  const last = parts[parts.length - 1];
  const hasToman = last.includes("تومان");
  const joined = parts.join(" و ");
  return sign + (hasToman ? joined : `${joined} تومان`);
}

// ✅ فرم داخلی: priceText برای تایپ طبیعی اعشار
type AddAdFormState = Omit<AddAdPayload, "price"> & {
  priceText: string;
};

export default function AddAdModal({
  open,
  onOpenChange,
  onSubmit,
  initialValue,
  mode = "create",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: AddAdPayload) => Promise<void> | void;
  initialValue?: AddAdPayload;
  mode?: "create" | "edit";
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const empty: AddAdPayload = {
    type: "UsedSale",
    title: "",
    year: "",
    color: "",
    mileageKm: "",
    insuranceMonths: "",
    gearbox: "",
    chassisNumber: "",
    contactPhone: "",
    price: "",
    description: "",
  };

  const emptyForm: AddAdFormState = {
    ...empty,
    priceText: "",
  };

  const [form, setForm] = useState<AddAdFormState>(() => {
    if (!initialValue) return emptyForm;
    return {
      ...initialValue,
      priceText:
        initialValue.price === "" ? "" : String(initialValue.price ?? ""),
    };
  });

  const [loading, setLoading] = useState(false);
  const today = useMemo(() => todayJalali(), []);

  useEffect(() => {
    if (!open) return;

    if (!initialValue) {
      setForm(emptyForm);
      return;
    }

    setForm({
      ...initialValue,
      priceText: initialValue.price === "" ? "" : String(initialValue.price),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue]);

  function set<K extends keyof AddAdFormState>(key: K, val: AddAdFormState[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function numberOrEmpty(v: string): number | "" {
    if (v.trim() === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? n : "";
  }

  // ✅ فقط اعداد + یک نقطه + اعشار (برای اینکه 120. و 120.3 راحت تایپ بشه)
  function setPriceText(v: string) {
    const s = v.replace(/,/g, "").trim();

    // اجازه: "" | "120" | "120." | "120.3"
    if (s === "") return set("priceText", "");

    if (!/^\d*\.?\d*$/.test(s)) return;

    set("priceText", s);
  }

  function parsePrice(): number | "" {
    const t = (form.priceText ?? "").trim();
    if (!t) return "";
    if (t.endsWith(".")) return "";
    const n = Number(t);
    return Number.isFinite(n) ? n : "";
  }

  function validate() {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push("نام خودرو");
    if (form.year === "") missing.push("سال ساخت");
    if (!form.color.trim()) missing.push("رنگ");
    if (form.mileageKm === "") missing.push("کارکرد");
    if (!form.chassisNumber.trim()) missing.push("شماره شاسی");
    if (!form.contactPhone.trim()) missing.push("شماره تماس");

    if (!form.priceText.trim()) missing.push("قیمت");

    const p = parsePrice();
    if (form.priceText.trim() && p === "") {
      missing.push("قیمت معتبر");
    }

    if (form.contactPhone.trim() && form.contactPhone.trim().length < 10) {
      missing.push("شماره تماس معتبر");
    }

    return { ok: missing.length === 0, missing };
  }

  function showValidationToast(missing: string[]) {
    const title = "فرم کامل نیست";
    const desc =
      missing.length <= 4
        ? `لطفاً این موارد را تکمیل کنید: ${missing.join("، ")}`
        : `چند مورد ناقص است. لطفاً فیلدهای ستاره‌دار (*) را کامل کنید.`;
    toast.error(title, { description: desc });
  }

  async function handleSubmit() {
    const v = validate();
    if (!v.ok) return showValidationToast(v.missing);

    const price = parsePrice();
    const payload: AddAdPayload = {
      type: form.type,
      title: form.title,
      year: form.year,
      color: form.color,
      mileageKm: form.mileageKm,
      insuranceMonths: form.insuranceMonths,
      gearbox: form.gearbox,
      chassisNumber: form.chassisNumber,
      contactPhone: form.contactPhone,
      price: price === "" ? 0 : price,
      description: form.description ?? "",
    };

    setLoading(true);
    try {
      toast.loading(
        mode === "edit" ? "در حال ویرایش..." : "در حال ارسال فرم...",
        {
          id: "add-ad",
        }
      );

      await onSubmit(payload);

      toast.success(mode === "edit" ? "آگهی ویرایش شد ✅" : "آگهی ثبت شد ✅", {
        id: "add-ad",
        description: "در همین صفحه نمایش داده می‌شود.",
      });

      onOpenChange(false);
      setForm(emptyForm);
    } catch (e: any) {
      toast.error(
        mode === "edit" ? "ویرایش آگهی ناموفق بود" : "ثبت آگهی ناموفق بود",
        {
          id: "add-ad",
          description: errorToText(e, "لطفاً دوباره تلاش کنید."),
        }
      );
    } finally {
      setLoading(false);
    }
  }

  // ✅ گرادیانت (دارک/لایت هماهنگ با هدر)
  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.80), rgba(56,189,248,.72), rgba(217,70,239,.66))";
  }, [isDark]);

  const surfaceBg = useMemo(() => {
    return isDark
      ? "linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 10%) 100%)"
      : "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)";
  }, [isDark]);

  const stickyBg = useMemo(() => {
    return isDark
      ? "linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 10%) 100%)"
      : "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)";
  }, [isDark]);

  const inactiveBtnBg = useMemo(() => {
    return isDark ? "hsl(0 0% 10%)" : "hsl(var(--background))";
  }, [isDark]);

  const roleBtnBase =
    "h-11 w-full rounded-2xl border text-sm font-semibold " +
    "transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md " +
    "active:translate-y-0 active:shadow-sm cursor-pointer";

  const priceHuman = useMemo(() => {
    const t = (form.priceText ?? "").trim();
    if (!t) return "";
    if (t.endsWith(".")) return "";
    const n = Number(t);
    if (!Number.isFinite(n)) return "";
    return formatFromMillionInput(n);
  }, [form.priceText]);

  // ✅ Toggle برای گیربکس
  function toggleGearbox(next: GearboxType) {
    set("gearbox", form.gearbox === next ? "" : next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("p-0 overflow-hidden w-[92vw] max-w-[620px]")}
        style={{
          borderRadius: 28,
          borderColor: "hsl(var(--border))",
          background: surfaceBg,
        }}
      >
        <VisuallyHidden>
          <DialogTitle>
            {mode === "edit" ? "ویرایش آگهی" : "افزودن آگهی"}
          </DialogTitle>
        </VisuallyHidden>

        <div className="h-1.5 w-full" style={{ background: softGradient }} />

        <div
          className="sticky top-0 z-30"
          style={{
            background: stickyBg,
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <div className="px-4 sm:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="w-10" />

              <div className="flex-1 flex justify-center">
                <div
                  className="px-4 py-2 rounded-2xl border text-sm font-semibold"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: softGradient,
                    color: "hsl(var(--foreground))",
                  }}
                >
                  امروز • {today}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-2xl border grid place-items-center cursor-pointer transition hover:scale-105"
                style={{
                  borderColor: "hsl(var(--border))",
                  background: isDark
                    ? "hsl(0 0% 10%)"
                    : "hsl(var(--background))",
                }}
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {tabs.map((t) => {
                const active = form.type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => set("type", t.key)}
                    className={cn(
                      "px-4 py-2 rounded-2xl border text-sm font-semibold cursor-pointer select-none",
                      "transition-all hover:-translate-y-[1px] hover:shadow-sm"
                    )}
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: active ? softGradient : inactiveBtnBg,
                      color: "hsl(var(--foreground))",
                    }}
                    onMouseEnter={(e) => {
                      if (!active)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = softGradient;
                    }}
                    onMouseLeave={(e) => {
                      if (!active)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = inactiveBtnBg;
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5 max-h-[78vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Field label="نام خودرو *">
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="مثلاً: Sonata 2018 | 206 تیپ 2"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="سال ساخت *">
              <Input
                value={form.year === "" ? "" : String(form.year)}
                onChange={(e) => set("year", numberOrEmpty(e.target.value))}
                placeholder={hintYear()}
                inputMode="numeric"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="رنگ *">
              <Input
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                placeholder="مثلاً سفید"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="کارکرد (کیلومتر) *">
              <Input
                value={form.mileageKm === "" ? "" : String(form.mileageKm)}
                onChange={(e) =>
                  set("mileageKm", numberOrEmpty(e.target.value))
                }
                placeholder="مثلاً 45000"
                inputMode="numeric"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="مهلت بیمه (ماه)">
              <Input
                value={
                  form.insuranceMonths === ""
                    ? ""
                    : String(form.insuranceMonths)
                }
                onChange={(e) =>
                  set("insuranceMonths", numberOrEmpty(e.target.value))
                }
                placeholder="مثلاً 6"
                inputMode="numeric"
                className="rounded-2xl h-12"
              />
            </Field>

            {/* ✅ گیربکس: فقط ۲ دکمه + toggle (خاموش = هیچکدام) */}
            <Field label="گیربکس">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => toggleGearbox("Automatic")}
                  className={cn(roleBtnBase)}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background:
                      form.gearbox === "Automatic"
                        ? softGradient
                        : inactiveBtnBg,
                    color: "hsl(var(--foreground))",
                  }}
                  onMouseEnter={(e) => {
                    if (form.gearbox !== "Automatic")
                      (e.currentTarget as HTMLButtonElement).style.background =
                        softGradient;
                  }}
                  onMouseLeave={(e) => {
                    if (form.gearbox !== "Automatic")
                      (e.currentTarget as HTMLButtonElement).style.background =
                        inactiveBtnBg;
                  }}
                >
                  اتومات
                </button>

                <button
                  type="button"
                  onClick={() => toggleGearbox("Manual")}
                  className={cn(roleBtnBase)}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background:
                      form.gearbox === "Manual" ? softGradient : inactiveBtnBg,
                    color: "hsl(var(--foreground))",
                  }}
                  onMouseEnter={(e) => {
                    if (form.gearbox !== "Manual")
                      (e.currentTarget as HTMLButtonElement).style.background =
                        softGradient;
                  }}
                  onMouseLeave={(e) => {
                    if (form.gearbox !== "Manual")
                      (e.currentTarget as HTMLButtonElement).style.background =
                        inactiveBtnBg;
                  }}
                >
                  دنده‌ای
                </button>
              </div>

              {/* نمایش حالت هیچکدام */}
              {form.gearbox === "" ? (
                <div className="mt-2 text-xs text-muted-foreground text-right">
                  حالت فعلی: هیچکدام
                </div>
              ) : null}
            </Field>

            <Field label="شماره تماس *">
              <Input
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                placeholder="مثلاً 09123456789"
                className="rounded-2xl h-12"
              />
            </Field>

            <Field label="شماره شاسی *">
              <Input
                value={form.chassisNumber}
                onChange={(e) => set("chassisNumber", e.target.value)}
                placeholder="مثلاً IR-CHS-12345"
                className="rounded-2xl h-12"
              />
            </Field>

            {/* ✅ قیمت: تایپ اعشار آزاد + معادل میلیارد/میلیون/هزار */}
            <Field label="قیمت (بر اساس میلیون تومان) *">
              <Input
                value={form.priceText}
                onChange={(e) => setPriceText(e.target.value)}
                placeholder={hintPrice()}
                inputMode="decimal"
                className="rounded-2xl h-12"
              />

              {priceHuman ? (
                <div
                  className="mt-2 rounded-2xl border px-4 py-2 text-sm font-semibold text-right"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background: isDark
                      ? "color-mix(in srgb, rgba(255,255,255,.10) 65%, hsl(0 0% 10%) 35%)"
                      : "linear-gradient(90deg, rgba(34,197,94,.18), rgba(56,189,248,.14), rgba(217,70,239,.12))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  {toFaNum(priceHuman)}
                </div>
              ) : null}
            </Field>

            <Field label="توضیحات (وضعیت بدنه، رنگ‌شدگی، لاستیک‌ها و...)">
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="دلخواه"
                className="rounded-2xl min-h-[120px]"
              />
            </Field>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-2xl h-12 font-semibold cursor-pointer transition hover:-translate-y-[1px] hover:shadow-md"
              style={{
                border: "1px solid hsl(var(--border))",
                background: softGradient,
                color: "hsl(var(--foreground))",
              }}
            >
              {loading
                ? "در حال ارسال..."
                : mode === "edit"
                ? "ذخیره تغییرات"
                : "ارسال فرم"}
            </Button>
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
