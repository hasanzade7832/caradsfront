"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useTheme } from "next-themes";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type BioMode = "advanced" | "simple";

export type BioFormValue = {
  mode: BioMode;

  // Advanced
  title: string;
  person: string;
  contactInfo: string;

  // Simple
  simpleText: string;
};

export default function BioModal({
  open,
  onOpenChange,
  onSubmit,
  initialValue,
  mode = "create",
  lockTab = null, // ✅ فقط در edit استفاده می‌شود
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: BioFormValue) => Promise<void> | void;
  initialValue?: BioFormValue;
  mode?: "create" | "edit";
  lockTab?: BioMode | null;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // ✅ Accent gradient (لایت ملایم / دارک پررنگ‌تر)
  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.12), rgba(56,189,248,.10), rgba(217,70,239,.10))";
  }, [isDark]);

  // ✅ Surface background (هماهنگ با کارت‌ها)
  const surfaceBg = useMemo(() => {
    // نزدیک به الگوی cardBg / Header modal
    return isDark
      ? "linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 7%) 100%)"
      : "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)";
  }, [isDark]);

  // ✅ Input/Panel background (نرم و کارت‌مانند)
  const panelBg = useMemo(() => {
    return isDark
      ? "linear-gradient(180deg, color-mix(in srgb, hsl(0 0% 10%) 92%, transparent), color-mix(in srgb, hsl(0 0% 9%) 84%, transparent))"
      : "linear-gradient(180deg, color-mix(in srgb, var(--card) 92%, transparent), color-mix(in srgb, var(--card) 84%, transparent))";
  }, [isDark]);

  const [tab, setTab] = useState<BioMode>("advanced");

  const [title, setTitle] = useState("");
  const [person, setPerson] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [simpleText, setSimpleText] = useState("");

  const locked = mode === "edit" && !!lockTab;

  useEffect(() => {
    if (!open) return;

    const init: BioFormValue = initialValue ?? {
      mode: "advanced",
      title: "",
      person: "",
      contactInfo: "",
      simpleText: "",
    };

    // ✅ اگر edit و lockTab داریم: فقط همان تب
    if (locked) {
      setTab(lockTab!);
    } else {
      // create: از init.mode استفاده کن
      setTab(init.mode);
    }

    setTitle(init.title ?? "");
    setPerson(init.person ?? "");
    setContactInfo(init.contactInfo ?? "");
    setSimpleText(init.simpleText ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue, mode, lockTab]);

  async function submit() {
    if (tab === "advanced") {
      const t = title.trim();
      const p = person.trim();
      const c = contactInfo.trim();

      if (!t) return toast.error("عنوان الزامی است");
      if (!p) return toast.error("توضیحات الزامی است");
      if (!c) return toast.error("اطلاعات تماس الزامی است");

      await onSubmit({
        mode: "advanced",
        title: t,
        person: p,
        contactInfo: c,
        simpleText: simpleText ?? "",
      });
      return;
    }

    const s = (simpleText ?? "").trim();
    if (!s) return toast.error("توضیحات حالت ساده نمی‌تواند خالی باشد");

    await onSubmit({
      mode: "simple",
      title: title ?? "",
      person: person ?? "",
      contactInfo: contactInfo ?? "",
      simpleText: s,
    });
  }

  const tabBtnBase =
    "h-10 rounded-2xl border px-4 text-sm font-semibold " +
    "transition-all duration-200 " +
    "hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 active:shadow-sm";

  const classicFieldWrap =
    "rounded-2xl border px-4 py-3 " +
    "transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("p-0 overflow-hidden w-[94vw] max-w-[900px]")}
        style={{
          borderRadius: 26,
          borderColor: "hsl(var(--border))",
          background: surfaceBg,
        }}
      >
        <VisuallyHidden>
          <DialogTitle>
            {mode === "edit" ? "ویرایش بیوگرافی" : "افزودن بیوگرافی"}
          </DialogTitle>
        </VisuallyHidden>

        {/* نوار رنگی بالا */}
        <div className="h-1.5 w-full" style={{ background: softGradient }} />

        {/* دکمه بستن کوچکتر */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute left-3 top-3 z-20 h-9 w-9 rounded-2xl border grid place-items-center cursor-pointer transition hover:scale-105"
          style={{
            borderColor: "hsl(var(--border))",
            background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
          aria-label="بستن"
          title="بستن"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ✅ هدر جمع‌وجورتر */}
        <div className="p-4 sm:p-5 pt-10">
          {/* Tabs / یا فقط یک چیپ در edit */}
          <div className="flex justify-center">
            {locked ? (
              <div
                className="px-5 py-2 rounded-2xl text-sm font-extrabold border"
                style={{
                  background: softGradient,
                  color: "hsl(var(--foreground))",
                  borderColor: "hsl(var(--border))",
                }}
              >
                {tab === "advanced" ? "حالت پیشرفته" : "حالت ساده"}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab("advanced")}
                  className={cn(tabBtnBase)}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background:
                      tab === "advanced"
                        ? softGradient
                        : isDark
                        ? "hsl(0 0% 10%)"
                        : "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                  }}
                  onMouseEnter={(e) => {
                    if (tab !== "advanced")
                      (e.currentTarget as HTMLButtonElement).style.background =
                        softGradient;
                  }}
                  onMouseLeave={(e) => {
                    if (tab !== "advanced")
                      (e.currentTarget as HTMLButtonElement).style.background =
                        isDark ? "hsl(0 0% 10%)" : "hsl(var(--background))";
                  }}
                >
                  حالت پیشرفته
                </button>

                <button
                  type="button"
                  onClick={() => setTab("simple")}
                  className={cn(tabBtnBase)}
                  style={{
                    borderColor: "hsl(var(--border))",
                    background:
                      tab === "simple"
                        ? softGradient
                        : isDark
                        ? "hsl(0 0% 10%)"
                        : "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                  }}
                  onMouseEnter={(e) => {
                    if (tab !== "simple")
                      (e.currentTarget as HTMLButtonElement).style.background =
                        softGradient;
                  }}
                  onMouseLeave={(e) => {
                    if (tab !== "simple")
                      (e.currentTarget as HTMLButtonElement).style.background =
                        isDark ? "hsl(0 0% 10%)" : "hsl(var(--background))";
                  }}
                >
                  حالت ساده
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="mt-4 space-y-4"
          >
            {tab === "advanced" ? (
              <div
                className={cn(classicFieldWrap)}
                style={{
                  borderColor: "hsl(var(--border))",
                  background: panelBg,
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground text-right">
                      عنوان *
                    </div>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثلاً: مدیریت مالی"
                      className="rounded-2xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground text-right">
                      توضیحات *
                    </div>
                    <Input
                      value={person}
                      onChange={(e) => setPerson(e.target.value)}
                      placeholder="مثلاً: محمد هدایتی"
                      className="rounded-2xl h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground text-right">
                      اطلاعات تماس *
                    </div>
                    <Input
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="مثلاً: 09123434345"
                      className="rounded-2xl h-11"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={cn(classicFieldWrap)}
                style={{
                  borderColor: "hsl(var(--border))",
                  background: panelBg,
                }}
              >
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground text-right">
                    توضیحات *
                  </div>
                  <Textarea
                    value={simpleText}
                    onChange={(e) => setSimpleText(e.target.value)}
                    placeholder="متن ساده..."
                    className="rounded-2xl min-h-[150px]"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={submit}
              className="w-full rounded-2xl h-11 font-semibold cursor-pointer transition hover:-translate-y-[1px] hover:shadow-md"
              style={{
                border: "1px solid hsl(var(--border))",
                background: softGradient,
                color: "hsl(var(--foreground))",
              }}
            >
              {mode === "edit" ? "ذخیره تغییرات" : "افزودن"}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
