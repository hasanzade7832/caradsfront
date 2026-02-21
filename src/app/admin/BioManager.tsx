"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import BioModal, {
  type BioFormValue,
  type BioMode,
} from "@/components/bio/BioModal";

import { Pencil, Trash2 } from "lucide-react";

type BioItem = {
  id: number;
  userId: number;

  groupKey: string;

  isAdvanced: boolean;
  title: string;
  description: string;
  contactInfo: string | null;

  createdAt?: string;
  updatedAt?: string;
};

function toBool(v: any): boolean {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 11 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "yes";
}

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeBioItem(raw: any): BioItem {
  const id = toNum(raw?.id ?? raw?.Id ?? raw?.ID);
  const userId = toNum(raw?.userId ?? raw?.UserId ?? raw?.UserID);

  const groupKey = String(raw?.groupKey ?? raw?.GroupKey ?? "").trim();

  const isAdvanced = toBool(
    raw?.isAdvanced ?? raw?.IsAdvanced ?? raw?.ISAdvanced
  );

  const title = String(raw?.title ?? raw?.Title ?? "");
  const description = String(raw?.description ?? raw?.Description ?? "");
  const contactInfoRaw = raw?.contactInfo ?? raw?.ContactInfo ?? null;
  const contactInfo =
    contactInfoRaw === null || contactInfoRaw === undefined
      ? null
      : String(contactInfoRaw);

  const createdAt = raw?.createdAt ?? raw?.CreatedAt ?? undefined;
  const updatedAt = raw?.updatedAt ?? raw?.UpdatedAt ?? undefined;

  return {
    id,
    userId,
    groupKey,
    isAdvanced,
    title,
    description,
    contactInfo,
    createdAt,
    updatedAt,
  };
}

function clean(v?: string | null) {
  return String(v ?? "").trim();
}

function dateVal(iso?: string) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function makeGroupKey(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return (crypto as any).randomUUID();
    }
  } catch {}
  return `g_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type BioGroup = {
  key: string;
  advanced?: BioItem;
  simple?: BioItem;
  sortTime: number;
};

type EditingState = {
  group: BioGroup;
  lockMode: BioMode;
} | null;

export default function BioManager({
  canManageBio = true,
  embedded = false,
}: {
  canManageBio?: boolean;
  embedded?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [items, setItems] = useState<BioItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);

  // ✅ Accent gradient: لایت ملایم / دارک پررنگ‌تر
  const softGradient = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(34,197,94,.62), rgba(56,189,248,.54), rgba(217,70,239,.52))"
      : "linear-gradient(90deg, rgba(34,197,94,.12), rgba(56,189,248,.10), rgba(217,70,239,.10))";
  }, [isDark]);

  const rowBg = useMemo(() => {
    return isDark
      ? "linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.10), rgba(255,255,255,.06))"
      : "linear-gradient(90deg, color-mix(in srgb, hsl(var(--muted)) 58%, transparent), color-mix(in srgb, hsl(var(--muted)) 42%, transparent), color-mix(in srgb, hsl(var(--muted)) 58%, transparent))";
  }, [isDark]);

  const btnMotion =
    "cursor-pointer transition-all duration-200 ease-out " +
    "hover:-translate-y-[1px] hover:scale-[1.03] hover:shadow-md " +
    "active:translate-y-0 active:scale-100 active:shadow-sm";

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/bio/mine");
      const rawList = (res.data ?? []) as any[];
      setItems(rawList.map(normalizeBioItem));
    } catch (e: any) {
      setItems([]);
      toast.error("خطا در دریافت بیوگرافی", {
        description: e?.response?.data ?? "لطفاً دوباره تلاش کنید.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups: BioGroup[] = useMemo(() => {
    const map = new Map<string, BioGroup>();

    for (const it of items) {
      const key = clean(it.groupKey) || `fallback:${it.id}`;
      let g = map.get(key);

      if (!g) {
        g = { key, advanced: undefined, simple: undefined, sortTime: 0 };
        map.set(key, g);
      }

      if (it.isAdvanced) g.advanced = it;
      else g.simple = it;

      const t = Math.max(dateVal(it.createdAt), dateVal(it.updatedAt));
      g.sortTime = Math.max(g.sortTime, t);
    }

    return Array.from(map.values()).sort((a, b) => b.sortTime - a.sortTime);
  }, [items]);

  const rows = useMemo(() => {
    const out: Array<{
      key: string;
      group: BioGroup;
      item: BioItem;
      mode: BioMode;
      sortTime: number;
    }> = [];

    for (const g of groups) {
      if (g.advanced) {
        out.push({
          key: `${g.key}-adv-${g.advanced.id}`,
          group: g,
          item: g.advanced,
          mode: "advanced",
          sortTime: Math.max(
            dateVal(g.advanced.createdAt),
            dateVal(g.advanced.updatedAt)
          ),
        });
      }
      if (g.simple) {
        out.push({
          key: `${g.key}-sim-${g.simple.id}`,
          group: g,
          item: g.simple,
          mode: "simple",
          sortTime: Math.max(
            dateVal(g.simple.createdAt),
            dateVal(g.simple.updatedAt)
          ),
        });
      }
    }

    out.sort((a, b) => b.sortTime - a.sortTime);
    return out;
  }, [groups]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEditRow(g: BioGroup, mode: BioMode) {
    setEditing({ group: g, lockMode: mode });
    setOpen(true);
  }

  async function removeItem(id: number) {
    await api.delete(`/api/bio/${id}`);
  }

  async function removeRow(it: BioItem) {
    toast.loading("در حال حذف...", { id: "bio-del" });
    try {
      await removeItem(it.id);
      toast.success("حذف شد ✅", { id: "bio-del" });
      await load();
    } catch (e: any) {
      toast.error("حذف ناموفق بود", {
        id: "bio-del",
        description: e?.response?.data ?? "لطفاً دوباره تلاش کنید.",
      });
    }
  }

  function toInitialValue(g: BioGroup, lockMode: BioMode): BioFormValue {
    const adv = g.advanced;
    const sim = g.simple;

    if (lockMode === "simple") {
      return {
        mode: "simple",
        title: "",
        person: "",
        contactInfo: "",
        simpleText: sim ? sim.description ?? "" : "",
      };
    }

    return {
      mode: "advanced",
      title: adv ? adv.title ?? "" : "",
      person: adv ? adv.description ?? "" : "",
      contactInfo: adv ? adv.contactInfo ?? "" : "",
      simpleText: "",
    };
  }

  function hasAnyAdvanced(p: BioFormValue) {
    const t = clean((p as any).title);
    const person = clean((p as any).person);
    const c = clean((p as any).contactInfo);
    return !!(t || person || c);
  }

  function hasSimple(p: BioFormValue) {
    const s = clean((p as any).simpleText);
    return !!s;
  }

  async function handleSubmit(payload: BioFormValue): Promise<void> {
    try {
      const isEdit = !!editing;

      toast.loading(isEdit ? "در حال ذخیره..." : "در حال افزودن...", {
        id: "bio-save",
      });

      if (isEdit) {
        const { group: g, lockMode } = editing!;
        const groupKey = clean(g.key);

        if (lockMode === "advanced") {
          const wantAdv = hasAnyAdvanced(payload);
          if (!wantAdv) {
            toast.error("فرم پیشرفته خالی است", { id: "bio-save" });
            return;
          }

          if (g.advanced) {
            await api.put(`/api/bio/${g.advanced.id}`, {
              GroupKey: groupKey,
              IsAdvanced: true,
              Title: clean((payload as any).title),
              Description: clean((payload as any).person),
              ContactInfo: clean((payload as any).contactInfo) || null,
            });
          } else {
            await api.post("/api/bio", {
              GroupKey: groupKey,
              IsAdvanced: true,
              Title: clean((payload as any).title),
              Description: clean((payload as any).person),
              ContactInfo: clean((payload as any).contactInfo) || null,
            });
          }

          toast.success("ذخیره شد ✅", { id: "bio-save" });
          setOpen(false);
          setEditing(null);
          await load();
          return;
        }

        const wantSimple = hasSimple(payload);
        if (!wantSimple) {
          toast.error("متن ساده نمی‌تواند خالی باشد", { id: "bio-save" });
          return;
        }

        if (g.simple) {
          await api.put(`/api/bio/${g.simple.id}`, {
            GroupKey: groupKey,
            IsAdvanced: false,
            Title: null,
            Description: clean((payload as any).simpleText),
            ContactInfo: null,
          });
        } else {
          await api.post("/api/bio", {
            GroupKey: groupKey,
            IsAdvanced: false,
            Title: null,
            Description: clean((payload as any).simpleText),
            ContactInfo: null,
          });
        }

        toast.success("ذخیره شد ✅", { id: "bio-save" });
        setOpen(false);
        setEditing(null);
        await load();
        return;
      }

      const wantAdv = hasAnyAdvanced(payload);
      const wantSimple = hasSimple(payload);

      if (!wantAdv && !wantSimple) {
        toast.error("فرم خالی است", {
          id: "bio-save",
          description: "حداقل یکی از بخش‌ها را پر کنید.",
        });
        return;
      }

      const newGroupKey = makeGroupKey();

      if (wantAdv) {
        await api.post("/api/bio", {
          GroupKey: newGroupKey,
          IsAdvanced: true,
          Title: clean((payload as any).title),
          Description: clean((payload as any).person),
          ContactInfo: clean((payload as any).contactInfo) || null,
        });
      }

      if (wantSimple) {
        await api.post("/api/bio", {
          GroupKey: newGroupKey,
          IsAdvanced: false,
          Title: null,
          Description: clean((payload as any).simpleText),
          ContactInfo: null,
        });
      }

      toast.success("ذخیره شد ✅", { id: "bio-save" });

      setOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error("عملیات ناموفق بود", {
        id: "bio-save",
        description: e?.response?.data ?? "لطفاً دوباره تلاش کنید.",
      });
    }
  }

  function rowText(it: BioItem) {
    if (it.isAdvanced) {
      const parts: string[] = [];
      const t = clean(it.title);
      const d = clean(it.description);
      const c = clean(it.contactInfo);

      if (t && d) parts.push(`${t}: ${d}`);
      else if (t) parts.push(t);
      else if (d) parts.push(d);

      if (c) parts.push(c);

      return parts.join(" - ");
    }

    return clean(it.description);
  }

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
        <h2 className="text-base font-semibold text-foreground">
          مدیریت بیوگرافی
        </h2>

        <Button
          onClick={openCreate}
          disabled={!canManageBio}
          variant="outline"
          className={[
            "rounded-2xl border transition-all duration-200",
            "hover:-translate-y-[1px] hover:shadow-md",
            !canManageBio ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
          style={{
            background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
          onMouseEnter={(e) => {
            if (!canManageBio) return;
            (e.currentTarget as HTMLButtonElement).style.background =
              softGradient;
          }}
          onMouseLeave={(e) => {
            if (!canManageBio) return;
            (e.currentTarget as HTMLButtonElement).style.background = isDark
              ? "hsl(0 0% 10%)"
              : "hsl(var(--card))";
          }}
        >
          + افزودن بیوگرافی
        </Button>
      </div>

      <BioModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        onSubmit={handleSubmit}
        mode={editing ? "edit" : "create"}
        initialValue={
          editing ? toInitialValue(editing.group, editing.lockMode) : undefined
        }
        lockTab={editing ? editing.lockMode : null}
      />

      <Separator className="my-4 opacity-70" />

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          در حال بارگذاری...
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-sm text-muted-foreground">
            هنوز موردی ثبت نشده.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, idx) => {
            const it = r.item;

            return (
              <motion.div
                key={r.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.18,
                  delay: Math.min(idx * 0.02, 0.16),
                }}
                className="rounded-2xl px-3 py-2"
                style={{ background: rowBg }}
              >
                {/* ✅ اینجا مهمه: متن راست، اکشن‌ها چپ (روبروی هم) */}
                <div className="flex items-center justify-between gap-3">
                  {/* ✅ Text RIGHT */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-sm sm:text-[15px] font-semibold text-foreground break-words">
                      {rowText(it)}
                    </div>
                  </div>

                  {/* ✅ Actions LEFT (چسبیده به لبه چپ ردیف) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditRow(r.group, r.mode)}
                      disabled={!canManageBio}
                      className={[
                        "h-10 w-10 rounded-2xl grid place-items-center",
                        btnMotion,
                        !canManageBio ? "opacity-50 cursor-not-allowed" : "",
                      ].join(" ")}
                      style={{
                        background: isDark
                          ? "color-mix(in srgb, rgb(250 204 21) 26%, rgba(255,255,255,.08) 74%)"
                          : "color-mix(in srgb, rgb(250 204 21) 18%, hsl(var(--muted)) 82%)",
                      }}
                      title="ویرایش"
                      aria-label="ویرایش"
                    >
                      <Pencil className="h-4 w-4 text-yellow-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeRow(it)}
                      disabled={!canManageBio}
                      className={[
                        "h-10 w-10 rounded-2xl grid place-items-center",
                        btnMotion,
                        !canManageBio ? "opacity-50 cursor-not-allowed" : "",
                      ].join(" ")}
                      style={{
                        background: isDark
                          ? "color-mix(in srgb, rgb(239 68 68) 22%, rgba(255,255,255,.08) 78%)"
                          : "color-mix(in srgb, rgb(239 68 68) 16%, hsl(var(--muted)) 84%)",
                      }}
                      title="حذف"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
