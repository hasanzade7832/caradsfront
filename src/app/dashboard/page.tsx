"use client";

import Header from "@/components/Header";
import { api } from "@/lib/api";
import { startSignalR, getConnection } from "@/lib/signalr";
import { useAuthStore } from "@/store/auth.store";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import jalaliday from "jalaliday";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Search,
  X,
  Eye,
} from "lucide-react";

import AddAdModal, { AddAdPayload } from "@/components/ads/AddAdModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTheme } from "next-themes";

dayjs.extend(jalaliday);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Ad = {
  id: number;
  userId: number;
  type: number;
  title: string;
  year: number;
  color: string;
  mileageKm: number;
  price: number;
  gearbox: number;
  createdAt: string;
  insuranceMonths?: number | null;
  chassisNumber?: string;
  contactPhone?: string;
  description?: string;
  viewCount: number;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const cardBgBase =
  "linear-gradient(180deg, color-mix(in srgb, var(--card) 94%, transparent), color-mix(in srgb, var(--card) 86%, transparent))";

function todayLabelJalali() {
  return dayjs().calendar("jalali").locale("fa").format("YYYY/MM/DD");
}

function toJalaliDay(iso: string) {
  return dayjs(iso).calendar("jalali").locale("fa").format("YYYY/MM/DD");
}

function typeNumToKey(n: number): AddAdPayload["type"] {
  if (n === 2) return "CoopSale";
  if (n === 3) return "BuyRequest";
  if (n === 4) return "ZeroSale";
  return "UsedSale";
}

function gearboxNumToKey(n: number): AddAdPayload["gearbox"] | "" {
  if (n === 1) return "Automatic";
  if (n === 2) return "Manual";
  return "";
}

function typeKeyToNum(k: AddAdPayload["type"]) {
  const map: Record<AddAdPayload["type"], number> = {
    UsedSale: 1,
    CoopSale: 2,
    BuyRequest: 3,
    ZeroSale: 4,
  };
  return map[k];
}

function gearboxKeyToNum(k: AddAdPayload["gearbox"] | "") {
  const map: Record<string, number> = { "": 0, Automatic: 1, Manual: 2 };
  return map[k] ?? 0;
}

function gearboxLabel(n: number) {
  if (n === 1) return "اتومات";
  if (n === 2) return "دنده‌ای";
  return "";
}

// ─────────────────────────────────────────────
// SearchableSelect
// ─────────────────────────────────────────────
type Opt = { value: string; label: string; disabled?: boolean };

function SearchableSelect({
  value,
  onChange,
  placeholder,
  options,
  widthClass = "w-[180px]",
  disabled = false,
  softGradient,
  borderColor,
  baseBg,
  popoverBg,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Opt[];
  widthClass?: string;
  disabled?: boolean;
  softGradient: string;
  borderColor: string;
  baseBg: string;
  popoverBg: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((x) => x.value === value)?.label ?? "";
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${widthClass}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((p) => !p);
            setQ("");
          }
        }}
        className={[
          "h-10 w-full rounded-2xl border px-3 flex items-center justify-between gap-2 transition-all duration-200",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:-translate-y-[1px] hover:shadow-md",
        ].join(" ")}
        style={{
          borderColor,
          background: baseBg,
          color: "hsl(var(--foreground))",
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.background = softGradient;
        }}
        onMouseLeave={(e) => {
          if (!disabled) e.currentTarget.style.background = baseBg;
        }}
      >
        <span className="text-[13px] font-semibold truncate">
          {selectedLabel || placeholder}
        </span>
        <span className="flex items-center gap-2">
          {value ? (
            <span
              onClick={(ev) => {
                ev.stopPropagation();
                onChange("");
              }}
              className="h-7 w-7 rounded-xl grid place-items-center border cursor-pointer"
              style={{ borderColor, background: "hsl(var(--background))" }}
            >
              <X className="h-4 w-4" />
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4 opacity-80" />
        </span>
      </button>

      {open && !disabled && (
        <div
          className="absolute z-50 mt-2 w-full rounded-2xl border shadow-lg overflow-hidden"
          style={{
            borderColor,
            background: popoverBg,
            color: "hsl(var(--popover-foreground))",
          }}
        >
          <div className="p-2 border-b" style={{ borderColor }}>
            <div
              className="h-10 rounded-2xl border px-3 flex items-center gap-2"
              style={{ borderColor, background: "hsl(var(--background))" }}
            >
              <Search className="h-4 w-4 opacity-70" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجو..."
                className="w-full bg-transparent outline-none text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-auto p-2 space-y-2">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                موردی پیدا نشد
              </div>
            ) : (
              filtered.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={o.disabled}
                    onClick={() => {
                      if (!o.disabled) {
                        onChange(o.value);
                        setOpen(false);
                        setQ("");
                      }
                    }}
                    className={[
                      "w-full text-right px-3 py-2 rounded-2xl border text-sm font-semibold transition-all",
                      o.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer hover:-translate-y-[1px] hover:shadow-sm",
                    ].join(" ")}
                    style={{
                      borderColor,
                      background: active
                        ? softGradient
                        : "hsl(var(--background))",
                    }}
                    onMouseEnter={(e) => {
                      if (!o.disabled && !active)
                        e.currentTarget.style.background = softGradient;
                    }}
                    onMouseLeave={(e) => {
                      if (!o.disabled && !active)
                        e.currentTarget.style.background =
                          "hsl(var(--background))";
                    }}
                  >
                    {o.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
function AdsSkeletonGrid({
  borderColor,
  cardItemBg,
}: {
  borderColor: string;
  cardItemBg: string;
}) {
  return (
    <>
      <style jsx global>{`
        @keyframes shimmerMove {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .tg-shimmer {
          background-image: linear-gradient(
            90deg,
            color-mix(in srgb, hsl(var(--card)) 92%, transparent),
            color-mix(in srgb, hsl(var(--foreground)) 12%, transparent),
            color-mix(in srgb, hsl(var(--card)) 92%, transparent)
          );
          background-size: 220% 100%;
          animation: shimmerMove 1.35s infinite linear;
        }
      `}</style>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 place-items-center">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-full max-w-[380px] rounded-[22px] border p-4"
            style={{ borderColor, background: cardItemBg }}
          >
            <div className="tg-shimmer h-5 rounded-xl w-3/4" />
            <div className="mt-3 tg-shimmer h-4 rounded-xl w-full" />
            <div className="mt-2 tg-shimmer h-4 rounded-xl w-5/6" />
            <div className="mt-4 tg-shimmer h-10 rounded-2xl w-44 mx-auto" />
            <div className="mt-4 flex items-center justify-between">
              <div className="tg-shimmer h-10 rounded-2xl w-24" />
              <div className="tg-shimmer h-10 rounded-2xl w-24" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// AdCard with flash support
// ─────────────────────────────────────────────
function AdCard({
  ad,
  flashCount,
  onEdit,
  onDelete,
  softGradient,
  borderColor,
  cardItemBg,
  chipBg,
  hoverShadow,
  isDark,
}: {
  ad: Ad;
  flashCount: number;
  onEdit: () => void;
  onDelete: () => void;
  softGradient: string;
  borderColor: string;
  cardItemBg: string;
  chipBg: string;
  hoverShadow: string;
  isDark: boolean;
}) {
  const [isFlashing, setIsFlashing] = useState(false);
  const prevFlash = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (flashCount > 0 && flashCount !== prevFlash.current) {
      prevFlash.current = flashCount;
      // scroll to card
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 2400);
    }
  }, [flashCount]);

  const gb = gearboxLabel(ad.gearbox);

  return (
    <div
      ref={cardRef}
      className="relative rounded-[26px] border p-4 sm:p-5 transition-all hover:-translate-y-[2px]"
      style={{
        borderColor: isFlashing ? "rgba(56,189,248,0.92)" : borderColor,
        background: cardItemBg,
        boxShadow: isFlashing
          ? "0 0 0 2px rgba(56,189,248,0.5), 0 0 36px rgba(56,189,248,0.30)"
          : "none",
        animation: isFlashing
          ? "dashCardFlash 0.38s ease-in-out infinite alternate"
          : "none",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isFlashing)
          (e.currentTarget as HTMLDivElement).style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        if (!isFlashing)
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* دکمه‌های ویرایش/حذف */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="h-10 w-10 rounded-2xl border grid place-items-center cursor-pointer transition hover:-translate-y-[1px] hover:shadow-md"
          style={{
            borderColor,
            background: isDark
              ? "color-mix(in srgb, rgb(250 204 21) 20%, rgba(255,255,255,.06) 80%)"
              : "color-mix(in srgb, rgba(250,204,21,.22) 22%, hsl(var(--background)) 78%)",
          }}
          title="ویرایش"
        >
          <Pencil className="h-5 w-5 text-yellow-400" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-10 w-10 rounded-2xl border grid place-items-center cursor-pointer transition hover:-translate-y-[1px] hover:shadow-md"
          style={{
            borderColor,
            background: isDark
              ? "color-mix(in srgb, rgb(239 68 68) 18%, rgba(255,255,255,.06) 82%)"
              : "color-mix(in srgb, rgba(239,68,68,.22) 22%, hsl(var(--background)) 78%)",
          }}
          title="حذف"
        >
          <Trash2 className="h-5 w-5 text-red-500" />
        </button>
      </div>

      <div className="pt-10 text-center">
        <div className="text-lg sm:text-xl font-extrabold text-foreground">
          {ad.title}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <div
            className="px-4 py-2 rounded-2xl text-sm font-semibold"
            style={{ background: chipBg }}
          >
            سال {ad.year}
          </div>
          <div
            className="px-4 py-2 rounded-2xl text-sm font-semibold"
            style={{ background: chipBg }}
          >
            رنگ {ad.color}
          </div>
          <div
            className="px-4 py-2 rounded-2xl text-sm font-semibold"
            style={{ background: chipBg }}
          >
            {ad.mileageKm.toLocaleString()} km
          </div>
          {gb && (
            <div
              className="px-4 py-2 rounded-2xl text-sm font-semibold"
              style={{ background: chipBg }}
            >
              گیربکس {gb}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-center">
          <div
            className="px-6 py-3 rounded-2xl border text-base font-extrabold"
            style={{ borderColor, background: softGradient }}
          >
            {ad.price.toLocaleString()}{" "}
            <span className="text-xs font-semibold opacity-80">میلیون</span>
          </div>
        </div>
      </div>

      {/* بازدید + تاریخ */}
      <div className="mt-5 flex items-center justify-between">
        <div
          className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl transition-all duration-300"
          style={{
            background: isFlashing ? softGradient : chipBg,
          }}
        >
          <Eye className="h-4 w-4" />
          <span>{(ad.viewCount ?? 0).toLocaleString()}</span>
        </div>
        <div className="text-sm font-bold text-foreground/90">
          {toJalaliDay(ad.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard Page
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const softGradient = useMemo(
    () =>
      isDark
        ? "linear-gradient(90deg, rgba(34,197,94,.56), rgba(56,189,248,.48), rgba(217,70,239,.46))"
        : "linear-gradient(90deg, rgba(34,197,94,.12), rgba(56,189,248,.10), rgba(217,70,239,.10))",
    [isDark]
  );

  const borderColor = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb, hsl(var(--border)) 65%, rgba(255,255,255,.18) 35%)"
        : "hsl(var(--border))",
    [isDark]
  );

  const baseBtnBg = useMemo(
    () => (isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))"),
    [isDark]
  );

  const popoverBg = useMemo(
    () => (isDark ? "hsl(0 0% 10%)" : "hsl(var(--popover))"),
    [isDark]
  );

  const sectionBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.20) 100%)"
        : cardBgBase,
    [isDark]
  );

  const cardItemBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg, rgba(255,255,255,.035) 0%, rgba(255,255,255,.018) 55%, rgba(0,0,0,.18) 100%)"
        : "linear-gradient(180deg, color-mix(in srgb, var(--card) 94%, transparent), color-mix(in srgb, var(--card) 86%, transparent))",
    [isDark]
  );

  const chipBg = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb, rgba(255,255,255,.085) 70%, rgba(0,0,0,.35) 30%)"
        : "color-mix(in srgb, hsl(var(--foreground)) 7%, hsl(var(--background)) 93%)",
    [isDark]
  );

  const hoverShadow = useMemo(
    () =>
      isDark ? "0 18px 50px rgba(0,0,0,.55)" : "0 18px 60px rgba(0,0,0,.18)",
    [isDark]
  );

  // ── State ─────────────────────────────────────
  const [ads, setAds] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<AddAdPayload | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Ad | null>(null);

  const [selYear, setSelYear] = useState("");
  const [selMonth, setSelMonth] = useState("");
  const [selDay, setSelDay] = useState("");

  // ✅ flash counter per ad
  const [flashCounts, setFlashCounts] = useState<Record<number, number>>({});

  // ── Body overflow ─────────────────────────────
  useEffect(() => {
    if (!token) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [token]);

  // ── SignalR ───────────────────────────────────
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await startSignalR();
        const conn = getConnection();
        if (!conn) return;

        conn.off("CarAdCreatedForUser");
        conn.on("CarAdCreatedForUser", (ad: Ad) => {
          setAds((prev) => [ad, ...prev]);
          toast.success("آگهی جدید ثبت شد ✅");
        });

        conn.off("MyCarAdUpdated");
        conn.on("MyCarAdUpdated", (payload: any) => {
          setAds((prev) =>
            prev.map((x) => (x.id === payload.id ? { ...x, ...payload } : x))
          );
          toast.success("آگهی ویرایش شد ✅");
        });

        conn.off("MyCarAdDeleted");
        conn.on("MyCarAdDeleted", (payload: any) => {
          setAds((prev) => prev.filter((x) => x.id !== payload.adId));
          toast.success("آگهی حذف شد ✅");
        });

        // ✅ بازدید → آپدیت viewCount + flash + scroll to top
        conn.off("AdViewUpdated");
        conn.on(
          "AdViewUpdated",
          (payload: { adId: number; viewCount: number }) => {
            setAds((prev) => {
              const updated = prev.map((x) =>
                x.id === payload.adId
                  ? { ...x, viewCount: payload.viewCount }
                  : x
              );
              // آگهی بازدیدشده را اول لیست بیاور
              const idx = updated.findIndex((x) => x.id === payload.adId);
              if (idx > 0) {
                const [item] = updated.splice(idx, 1);
                updated.unshift(item);
              }
              return updated;
            });

            // flash کارت
            setFlashCounts((prev) => ({
              ...prev,
              [payload.adId]: (prev[payload.adId] ?? 0) + 1,
            }));
          }
        );
      } catch {}
    })();
  }, [token]);

  // ✅ همچنین CustomEvent از همان مرورگر
  useEffect(() => {
    const handler = (e: Event) => {
      const { adId, viewCount } = (e as CustomEvent).detail as {
        adId: number;
        viewCount: number;
      };
      setAds((prev) => {
        const updated = prev.map((x) =>
          x.id === adId ? { ...x, viewCount } : x
        );
        const idx = updated.findIndex((x) => x.id === adId);
        if (idx > 0) {
          const [item] = updated.splice(idx, 1);
          updated.unshift(item);
        }
        return updated;
      });
      setFlashCounts((prev) => ({
        ...prev,
        [adId]: (prev[adId] ?? 0) + 1,
      }));
    };
    window.addEventListener("carads_view_updated", handler);
    return () => window.removeEventListener("carads_view_updated", handler);
  }, []);

  // ── Load ads ──────────────────────────────────
  async function loadAds() {
    setErr(null);
    setAdsLoading(true);
    try {
      const res = await api.get("/api/ads/mine");
      const list = (res.data ?? []) as Ad[];
      list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setAds(list);
    } catch (e: any) {
      setErr(e?.response?.data ?? "خطا در دریافت آگهی‌های شما");
    } finally {
      setAdsLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Date index ────────────────────────────────
  const dateIndex = useMemo(() => {
    const map = new Map<string, Map<string, Set<string>>>();
    for (const ad of ads) {
      const d = toJalaliDay(ad.createdAt);
      const [y, m, da] = d.split("/");
      if (!y || !m || !da) continue;
      if (!map.has(y)) map.set(y, new Map());
      const mm = map.get(y)!;
      if (!mm.has(m)) mm.set(m, new Set());
      mm.get(m)!.add(da);
    }
    return {
      map,
      years: Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1)),
    };
  }, [ads]);

  const yearOptions = useMemo(
    () => dateIndex.years.map((y) => ({ value: y, label: `سال ${y}` })),
    [dateIndex.years]
  );

  const monthOptions = useMemo(() => {
    if (!selYear) return [];
    const mm = dateIndex.map.get(selYear);
    if (!mm) return [];
    return Array.from(mm.keys())
      .sort((a, b) => (a < b ? 1 : -1))
      .map((m) => ({ value: m, label: `ماه ${m}` }));
  }, [dateIndex.map, selYear]);

  const dayOptions = useMemo(() => {
    if (!selYear || !selMonth) return [];
    const set = dateIndex.map.get(selYear)?.get(selMonth);
    if (!set) return [];
    return Array.from(set)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((d) => ({ value: d, label: `روز ${d}` }));
  }, [dateIndex.map, selYear, selMonth]);

  useEffect(() => {
    setSelMonth("");
    setSelDay("");
  }, [selYear]);
  useEffect(() => {
    setSelDay("");
  }, [selMonth]);

  const filteredAds = useMemo(() => {
    if (!selYear && !selMonth && !selDay) return ads;
    return ads.filter((ad) => {
      const [y, m, da] = toJalaliDay(ad.createdAt).split("/");
      if (selYear && y !== selYear) return false;
      if (selMonth && m !== selMonth) return false;
      if (selDay && da !== selDay) return false;
      return true;
    });
  }, [ads, selYear, selMonth, selDay]);

  // ── Total views ───────────────────────────────
  const totalViews = useMemo(
    () => ads.reduce((s, a) => s + (a.viewCount ?? 0), 0),
    [ads]
  );

  // ── Not logged in ─────────────────────────────
  if (!token) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-[1650px] px-2 sm:px-4 py-10">
          <div
            className="rounded-3xl border p-5"
            style={{ borderColor, background: sectionBg }}
          >
            <div className="text-center text-sm text-muted-foreground">
              برای دیدن داشبورد، ابتدا وارد شوید.
            </div>
          </div>
        </main>
      </>
    );
  }

  // ── Handlers ──────────────────────────────────
  async function handleAddOrUpdate(payload: AddAdPayload) {
    const body = {
      type: typeKeyToNum(payload.type),
      title: payload.title,
      year: payload.year === "" ? 0 : payload.year,
      color: payload.color,
      mileageKm: payload.mileageKm === "" ? 0 : payload.mileageKm,
      insuranceMonths:
        payload.insuranceMonths === "" ? null : payload.insuranceMonths,
      gearbox: gearboxKeyToNum(payload.gearbox),
      chassisNumber: payload.chassisNumber,
      contactPhone: payload.contactPhone,
      price: payload.price === "" ? 0 : payload.price,
      description: payload.description ?? "",
    };

    if (editingAdId) {
      toast.loading("در حال ویرایش آگهی...", { id: "edit-ad" });
      await api.put(`/api/ads/${editingAdId}`, body);
      toast.success("آگهی ویرایش شد ✅", { id: "edit-ad" });
      await loadAds();
      setEditingAdId(null);
      setEditInitial(null);
      return;
    }

    toast.loading("در حال ثبت آگهی...", { id: "add-ad" });
    await api.post("/api/ads", body);
    toast.success("آگهی ثبت شد ✅", { id: "add-ad" });
    await loadAds();
  }

  function openEdit(ad: Ad) {
    setEditingAdId(ad.id);
    setEditInitial({
      type: typeNumToKey(ad.type),
      title: ad.title ?? "",
      year: ad.year ?? "",
      color: ad.color ?? "",
      mileageKm: ad.mileageKm ?? "",
      insuranceMonths: ad.insuranceMonths ?? "",
      gearbox: gearboxNumToKey(ad.gearbox),
      chassisNumber: ad.chassisNumber ?? "",
      contactPhone: ad.contactPhone ?? "",
      price: ad.price ?? "",
      description: ad.description ?? "",
    });
    setAddOpen(true);
  }

  function openDelete(ad: Ad) {
    setDeleting(ad);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    toast.loading("در حال حذف آگهی...", { id: "del-ad" });
    try {
      await api.delete(`/api/ads/${deleting.id}`);
      toast.success("آگهی حذف شد ✅", { id: "del-ad" });
      await loadAds();
    } catch (e: any) {
      toast.error("حذف آگهی ناموفق بود", {
        id: "del-ad",
        description: e?.response?.data ?? "لطفاً دوباره تلاش کنید.",
      });
    } finally {
      setDeleteOpen(false);
      setDeleting(null);
    }
  }

  const today = useMemo(() => todayLabelJalali(), []);

  return (
    <>
      <style>{`
        @keyframes dashCardFlash {
          from { box-shadow: 0 0 0 2px rgba(56,189,248,0.5), 0 0 20px rgba(56,189,248,0.2); }
          to   { box-shadow: 0 0 0 3px rgba(56,189,248,0.95), 0 0 44px rgba(56,189,248,0.52); }
        }
      `}</style>

      <Header />

      <AddAdModal
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) {
            setEditingAdId(null);
            setEditInitial(null);
          }
        }}
        onSubmit={handleAddOrUpdate}
        initialValue={editInitial ?? undefined}
        mode={editingAdId ? "edit" : "create"}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-[22px]">
          <DialogHeader>
            <DialogTitle className="text-right">حذف آگهی</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground leading-7 text-right">
            آیا از حذف این آگهی مطمئن هستید؟
            <div className="mt-2 font-semibold text-foreground">
              {deleting?.title}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setDeleteOpen(false)}
            >
              انصراف
            </Button>
            <Button
              className="rounded-2xl"
              onClick={confirmDelete}
              variant="destructive"
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main
        className="mx-auto max-w-[1650px] px-2 sm:px-4 py-3"
        style={{ height: "calc(100vh - 84px)" }}
      >
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="rounded-[26px] border flex flex-col overflow-hidden p-3 sm:p-4"
          style={{ borderColor, background: sectionBg, height: "100%" }}
        >
          {/* ── Top bar ── */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex justify-start">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingAdId(null);
                  setEditInitial(null);
                  setAddOpen(true);
                }}
                className="h-9 rounded-2xl border px-3 text-sm font-semibold"
                style={{
                  borderColor,
                  background: baseBtnBg,
                  color: "hsl(var(--foreground))",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    softGradient;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    baseBtnBg;
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  افزودن آگهی
                </span>
              </Button>
            </div>

            <div className="flex justify-center">
              <div
                className="px-4 py-1.5 rounded-2xl border text-[12px] font-semibold"
                style={{ borderColor, background: softGradient }}
              >
                امروز • {today}
              </div>
            </div>

            <div />
          </div>

          {/* ── Date filters ── */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            <SearchableSelect
              value={selYear}
              onChange={setSelYear}
              placeholder="انتخاب سال"
              options={yearOptions}
              widthClass="w-[170px]"
              disabled={yearOptions.length === 0}
              softGradient={softGradient}
              borderColor={borderColor}
              baseBg={baseBtnBg}
              popoverBg={popoverBg}
            />
            <SearchableSelect
              value={selMonth}
              onChange={setSelMonth}
              placeholder="انتخاب ماه"
              options={monthOptions}
              widthClass="w-[170px]"
              disabled={!selYear || monthOptions.length === 0}
              softGradient={softGradient}
              borderColor={borderColor}
              baseBg={baseBtnBg}
              popoverBg={popoverBg}
            />
            <SearchableSelect
              value={selDay}
              onChange={setSelDay}
              placeholder="انتخاب روز"
              options={dayOptions}
              widthClass="w-[170px]"
              disabled={!selYear || !selMonth || dayOptions.length === 0}
              softGradient={softGradient}
              borderColor={borderColor}
              baseBg={baseBtnBg}
              popoverBg={popoverBg}
            />
          </div>

          <Separator className="mt-3 opacity-70" />

          {/* ── Ad grid ── */}
          <div className="mt-3 flex-1 min-h-0">
            <div className="h-full overflow-y-auto pr-1">
              {err && (
                <div
                  className="mb-3 text-sm rounded-2xl p-3 border text-center"
                  style={{
                    borderColor:
                      "color-mix(in srgb, hsl(var(--destructive)) 65%, transparent)",
                    color: "hsl(var(--destructive))",
                  }}
                >
                  {String(err)}
                </div>
              )}

              {adsLoading ? (
                <AdsSkeletonGrid
                  borderColor={borderColor}
                  cardItemBg={cardItemBg}
                />
              ) : filteredAds.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-lg font-semibold">
                    آگهی‌ای برای نمایش وجود ندارد
                  </div>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 place-items-center pb-6">
                  {filteredAds.map((ad, idx) => (
                    <motion.div
                      key={ad.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.22,
                        delay: Math.min(idx * 0.02, 0.2),
                      }}
                      className="w-full max-w-[380px]"
                    >
                      <AdCard
                        ad={ad}
                        flashCount={flashCounts[ad.id] ?? 0}
                        onEdit={() => openEdit(ad)}
                        onDelete={() => openDelete(ad)}
                        softGradient={softGradient}
                        borderColor={borderColor}
                        cardItemBg={cardItemBg}
                        chipBg={chipBg}
                        hoverShadow={hoverShadow}
                        isDark={isDark}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer: بازدید کل ── */}
          <div
            className="mt-2 pt-2 flex items-center justify-center"
            style={{ borderTop: `1px solid hsl(var(--border) / 0.25)` }}
          >
            <div
              className="flex items-center gap-2 px-5 py-2 rounded-2xl border font-semibold text-sm"
              style={{
                borderColor,
                background: softGradient,
                boxShadow: isDark
                  ? "0 4px 20px rgba(0,0,0,0.4)"
                  : "0 4px 20px rgba(0,0,0,0.1)",
              }}
            >
              <Eye className="h-4 w-4" />
              <span>بازدید کل آگهی‌هایم:</span>
              <span className="font-extrabold text-base">
                {totalViews.toLocaleString("fa-IR")}
              </span>
            </div>
          </div>
        </motion.section>
      </main>
    </>
  );
}
