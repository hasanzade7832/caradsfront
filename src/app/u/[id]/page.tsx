"use client";

import Header from "@/components/Header";
import { api } from "@/lib/api";
import { joinProfile, leaveProfile, startSignalR } from "@/lib/signalr";
import { useAuthStore } from "@/store/auth.store";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Search, X, Eye } from "lucide-react";

dayjs.extend(jalaliday);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type PublicUser = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: "User" | "Admin" | "SuperAdmin";
  createdAt: string;
};

type BioItem = {
  id: number;
  userId: number;
  isAdvanced: boolean;
  title: string;
  description: string;
  contactInfo?: string | null;
  createdAt: string;
  updatedAt: string;
};

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
  viewCount: number;
  insuranceMonths?: number | null;
  chassisNumber?: string;
  contactPhone?: string;
  description?: string;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatBioLine(item: BioItem) {
  const title = (item.title ?? "").trim();
  const desc = (item.description ?? "").trim();
  const contact = (item.contactInfo ?? "").trim();
  if (item.isAdvanced) {
    const left = title ? `${title}: ` : "";
    const right = contact ? ` - ${contact}` : "";
    return `${left}${desc}${right}`.trim();
  }
  return desc;
}

function priceToText(millionVal: number): string {
  if (!Number.isFinite(millionVal) || millionVal <= 0) return "—";
  const billion = Math.floor(millionVal / 1000);
  const rem = millionVal - billion * 1000;
  const million = Math.floor(rem);
  const thousand = Math.round((rem - million) * 1000);
  const toFa = (n: number) => n.toLocaleString("fa-IR");
  const parts: string[] = [];
  if (billion > 0) parts.push(`${toFa(billion)} میلیارد`);
  if (million > 0) parts.push(`${toFa(million)} میلیون`);
  if (thousand > 0) parts.push(`${toFa(thousand)} هزار`);
  if (parts.length === 0) return "—";
  return parts.join(" و ") + " تومان";
}

const TYPE_LABELS: Record<number, string> = {
  1: "فروش کارکرده",
  2: "فروش همکاری",
  3: "درخواست خرید",
  4: "فروش صفر",
};
const GEARBOX_LABELS: Record<number, string> = {
  0: "—",
  1: "اتومات",
  2: "دنده‌ای",
};
function typeLabel(t: number | string) {
  return TYPE_LABELS[Number(t)] ?? "نامشخص";
}
function gearboxLabel(g: number | string) {
  return GEARBOX_LABELS[Number(g)] ?? "—";
}

// ─────────────────────────────────────────────
// Details Modal
// ─────────────────────────────────────────────
function DetailsModal({
  ad,
  open,
  onClose,
  softGradient,
  borderColor,
  isDark,
}: {
  ad: Ad | null;
  open: boolean;
  onClose: () => void;
  softGradient: string;
  borderColor: string;
  isDark: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open || !ad) return null;

  const rows: { label: string; value: string }[] = [
    { label: "عنوان", value: ad.title },
    { label: "نوع آگهی", value: typeLabel(ad.type) },
    { label: "سال تولید", value: String(ad.year) },
    { label: "رنگ", value: ad.color },
    {
      label: "کارکرد",
      value: `${Number(ad.mileageKm).toLocaleString("fa-IR")} کیلومتر`,
    },
    { label: "گیربکس", value: gearboxLabel(ad.gearbox) },
    { label: "قیمت", value: priceToText(ad.price) },
    ...(ad.insuranceMonths != null
      ? [{ label: "بیمه", value: `${ad.insuranceMonths} ماه` }]
      : []),
    ...(ad.chassisNumber?.trim()
      ? [{ label: "شماره شاسی", value: ad.chassisNumber! }]
      : []),
    ...(ad.contactPhone?.trim()
      ? [{ label: "شماره تماس", value: ad.contactPhone! }]
      : []),
    ...(ad.description?.trim()
      ? [{ label: "توضیحات", value: ad.description! }]
      : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.56)",
              backdropFilter: "blur(4px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div
              className="w-full max-w-md rounded-3xl border p-5 shadow-2xl"
              style={{
                borderColor,
                background: isDark
                  ? "linear-gradient(180deg, rgba(15,15,15,0.98) 0%, rgba(8,8,8,0.99) 100%)"
                  : "hsl(var(--card))",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4" dir="rtl">
                <h2 className="text-base font-extrabold text-foreground">
                  جزئیات آگهی
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 w-8 rounded-xl border grid place-items-center opacity-60 hover:opacity-100 transition-opacity"
                  style={{
                    borderColor,
                    background: isDark
                      ? "hsl(0 0% 12%)"
                      : "hsl(var(--background))",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2" dir="rtl">
                {rows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-start gap-2 rounded-2xl border px-3 py-2.5"
                    style={{
                      borderColor,
                      background: isDark
                        ? "hsl(0 0% 10%)"
                        : "hsl(var(--background))",
                    }}
                  >
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 mt-0.5"
                      style={{ background: softGradient }}
                    >
                      {r.label}
                    </span>
                    <span className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs text-muted-foreground">
                  ثبت:{" "}
                  {dayjs(ad.createdAt)
                    .calendar("jalali")
                    .locale("fa")
                    .format("YYYY/MM/DD • HH:mm")}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// ذره‌بین SVG
// ─────────────────────────────────────────────
function MagnifierIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// AdCard
// ─────────────────────────────────────────────
function AdCard({
  ad,
  highlighted,
  onDetails,
  softGradient,
  borderColor,
  chipBg,
  isDark,
}: {
  ad: Ad;
  highlighted: boolean;
  onDetails: (ad: Ad) => void;
  softGradient: string;
  borderColor: string;
  chipBg: string;
  isDark: boolean;
}) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [hoveredMag, setHoveredMag] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!highlighted) return;
    setTimeout(
      () =>
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      200
    );
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 2800);
  }, [highlighted]);

  function onMagEnter() {
    setHoveredMag(true);
    tipTimer.current = setTimeout(() => setShowTooltip(true), 280);
  }
  function onMagLeave() {
    setHoveredMag(false);
    setShowTooltip(false);
    if (tipTimer.current) clearTimeout(tipTimer.current);
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
    >
      <div
        className="relative rounded-2xl border p-4 flex flex-col items-center text-center"
        style={{
          borderColor: isFlashing ? "rgba(34,197,94,0.9)" : borderColor,
          background: isDark
            ? "linear-gradient(180deg, rgba(255,255,255,.033) 0%, rgba(0,0,0,.16) 100%)"
            : "hsl(var(--background))",
          boxShadow: isFlashing
            ? "0 0 0 2px rgba(34,197,94,0.5), 0 0 32px rgba(34,197,94,0.28)"
            : "none",
          animation: isFlashing
            ? "profileCardFlash 0.38s ease-in-out infinite alternate"
            : "none",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
      >
        {/* ✅ ذره‌بین — بالا چپ */}
        <div className="absolute top-3 left-3">
          <button
            type="button"
            onClick={() => onDetails(ad)}
            onMouseEnter={onMagEnter}
            onMouseLeave={onMagLeave}
            className="h-8 w-8 rounded-xl border grid place-items-center"
            style={{
              borderColor: hoveredMag ? "rgba(56,189,248,0.7)" : borderColor,
              background: hoveredMag
                ? isDark
                  ? "rgba(56,189,248,0.15)"
                  : "rgba(56,189,248,0.12)"
                : isDark
                ? "hsl(0 0% 12%)"
                : "hsl(var(--background))",
              cursor: "pointer",
              color: hoveredMag ? "rgb(56,189,248)" : "currentColor",
              opacity: hoveredMag ? 1 : 0.65,
              transform: hoveredMag ? "translateY(-1px) scale(1.1)" : "none",
              boxShadow: hoveredMag
                ? "0 4px 14px rgba(56,189,248,0.25)"
                : "none",
              transition: "all 0.16s",
            }}
          >
            <MagnifierIcon size={14} />
          </button>

          <AnimatePresence>
            {showTooltip && (
              <motion.div
                className="absolute top-9 left-0 z-20 pointer-events-none"
                initial={{ opacity: 0, y: -4, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.88 }}
                transition={{ duration: 0.14 }}
              >
                <div
                  className="text-[11px] font-bold px-2.5 py-1 rounded-xl whitespace-nowrap border"
                  style={{
                    borderColor: "rgba(56,189,248,0.45)",
                    background: isDark
                      ? "rgba(12,12,12,0.95)"
                      : "hsl(var(--card))",
                    color: "rgb(56,189,248)",
                    boxShadow: "0 4px 12px rgba(56,189,248,0.15)",
                  }}
                >
                  جزئیات
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* عنوان */}
        <div className="font-bold text-foreground text-sm leading-tight mt-1 px-6">
          {ad.title}
        </div>

        {/* نوع آگهی */}
        <div
          className="mt-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-semibold"
          style={{ background: softGradient }}
        >
          {typeLabel(ad.type)}
        </div>

        {/* چیپ‌ها */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className="text-xs px-2 py-0.5 rounded-lg font-medium"
            style={{ background: chipBg }}
          >
            {ad.year}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-lg font-medium"
            style={{ background: chipBg }}
          >
            {ad.color}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-lg font-medium"
            style={{ background: chipBg }}
          >
            {Number(ad.mileageKm).toLocaleString("fa-IR")} km
          </span>
          {Number(ad.gearbox) > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-lg font-medium"
              style={{ background: chipBg }}
            >
              {gearboxLabel(ad.gearbox)}
            </span>
          )}
        </div>

        {/* قیمت */}
        <div
          className="mt-4 text-sm font-extrabold px-4 py-2 rounded-xl border"
          style={{ borderColor, background: softGradient }}
        >
          {priceToText(ad.price)}
        </div>

        {/* ✅ پایین: تاریخ + بازدید */}
        <div
          className="mt-3 w-full flex items-center justify-between"
          dir="rtl"
        >
          <div className="text-[10px] text-muted-foreground">
            {dayjs(ad.createdAt)
              .calendar("jalali")
              .locale("fa")
              .format("YYYY/MM/DD • HH:mm")}
          </div>
          <div
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg"
            style={{ background: chipBg }}
          >
            <Eye className="h-3 w-3 opacity-70" />
            <span>{(ad.viewCount ?? 0).toLocaleString("fa-IR")}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function PublicUserPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = (params as any)?.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const profileId = Number(idStr);
  const highlightAdId = Number(searchParams.get("ad") ?? "0") || null;

  const { userId: meId, role: myRole, token } = useAuthStore();

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

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

  const chipBg = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb, rgba(255,255,255,.085) 70%, rgba(0,0,0,.35) 30%)"
        : "color-mix(in srgb, hsl(var(--foreground)) 7%, hsl(var(--background)) 93%)",
    [isDark]
  );

  const sectionBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.20) 100%)"
        : "linear-gradient(180deg, color-mix(in srgb, var(--card) 94%, transparent), color-mix(in srgb, var(--card) 86%, transparent))",
    [isDark]
  );

  // ── State ──
  const [user, setUser] = useState<PublicUser | null>(null);
  const [bio, setBio] = useState<BioItem[]>([]);
  const [allAds, setAllAds] = useState<Ad[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailsAd, setDetailsAd] = useState<Ad | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isOwner = meId === profileId;

  // ── Load ──
  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const [uRes, bioRes, adsRes] = await Promise.all([
        api.get(`/api/users/${profileId}`),
        api.get(`/api/bio/user/${profileId}`),
        api.get(`/api/ads`),
      ]);

      setUser(uRes.data);

      const bioList = (bioRes.data ?? []) as BioItem[];
      bioList.sort((a, b) => {
        if (!!a.isAdvanced !== !!b.isAdvanced) return a.isAdvanced ? -1 : 1;
        return a.createdAt < b.createdAt ? 1 : -1;
      });
      setBio(bioList);

      const onlyThis = (adsRes.data as Ad[]).filter(
        (x) => x.userId === profileId
      );

      if (highlightAdId) {
        const idx = onlyThis.findIndex((a) => a.id === highlightAdId);
        if (idx > 0) {
          const [item] = onlyThis.splice(idx, 1);
          onlyThis.unshift(item);
        }
      } else {
        onlyThis.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
      }

      setAllAds(onlyThis);
    } catch (e: any) {
      setErr(e?.response?.data ?? "خطا در دریافت اطلاعات کاربر");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(profileId)) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // ── Filter ──
  const filteredAds = useMemo(() => {
    if (!search.trim()) return allAds;
    const q = search.trim().toLowerCase();
    return allAds.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.color.toLowerCase().includes(q) ||
        String(a.year).includes(q) ||
        priceToText(a.price).includes(q)
    );
  }, [allAds, search]);

  // ── SignalR ──
  useEffect(() => {
    if (!Number.isFinite(profileId)) return;
    let unsub: (() => void) | null = null;
    let alive = true;

    (async () => {
      try {
        const conn = await startSignalR();
        if (!alive) return;
        await joinProfile(profileId);

        const onBioAdded = (p: any) => {
          if (p.userId !== profileId) return;
          setBio((prev) => {
            const next = [p as BioItem, ...prev];
            next.sort((a, b) => {
              if (!!a.isAdvanced !== !!b.isAdvanced)
                return a.isAdvanced ? -1 : 1;
              return a.createdAt < b.createdAt ? 1 : -1;
            });
            return next;
          });
        };
        const onBioUpdated = (p: any) => {
          if (p.userId !== profileId) return;
          setBio((prev) => {
            const next = prev.map((x) => (x.id === p.id ? { ...x, ...p } : x));
            next.sort((a, b) => {
              if (!!a.isAdvanced !== !!b.isAdvanced)
                return a.isAdvanced ? -1 : 1;
              return a.createdAt < b.createdAt ? 1 : -1;
            });
            return next;
          });
        };
        const onBioDeleted = (p: any) => {
          if (p.userId !== profileId) return;
          setBio((prev) => prev.filter((x) => x.id !== p.id));
        };
        const onAdCreated = (p: any) => {
          if (p.userId !== profileId) return;
          setAllAds((prev) => {
            if (prev.some((x) => x.id === p.id)) return prev;
            return [p, ...prev];
          });
        };
        const onAdUpdated = (p: any) => {
          if (p.userId !== profileId) return;
          setAllAds((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, ...p } : x))
          );
        };
        const onAdDeleted = (p: any) => {
          if (p.userId !== profileId) return;
          setAllAds((prev) => prev.filter((x) => x.id !== p.adId));
        };
        const onAdView = (p: { adId: number; viewCount: number }) => {
          setAllAds((prev) =>
            prev.map((x) =>
              x.id === p.adId ? { ...x, viewCount: p.viewCount } : x
            )
          );
        };

        conn.on("BioItemAdded", onBioAdded);
        conn.on("BioItemUpdated", onBioUpdated);
        conn.on("BioItemDeleted", onBioDeleted);
        conn.on("CarAdCreated", onAdCreated);
        conn.on("CarAdUpdated", onAdUpdated);
        conn.on("CarAdDeleted", onAdDeleted);
        conn.on("AdViewUpdated", onAdView);

        unsub = () => {
          conn.off("BioItemAdded", onBioAdded);
          conn.off("BioItemUpdated", onBioUpdated);
          conn.off("BioItemDeleted", onBioDeleted);
          conn.off("CarAdCreated", onAdCreated);
          conn.off("CarAdUpdated", onAdUpdated);
          conn.off("CarAdDeleted", onAdDeleted);
          conn.off("AdViewUpdated", onAdView);
        };
      } catch {}
    })();

    return () => {
      alive = false;
      unsub?.();
      leaveProfile(profileId).catch(() => {});
    };
  }, [profileId, token]);

  if (!Number.isFinite(profileId)) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border p-4 bg-card">آیدی نامعتبر</div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes profileCardFlash {
          from { box-shadow: 0 0 0 2px rgba(34,197,94,0.5), 0 0 20px rgba(34,197,94,0.22); }
          to   { box-shadow: 0 0 0 3px rgba(34,197,94,0.95), 0 0 42px rgba(34,197,94,0.52); }
        }
        @keyframes titleGlow {
          0%, 100% { opacity: 1; text-shadow: none; }
          50%       { opacity: 0.62; text-shadow: 0 0 18px rgba(56,189,248,0.35); }
        }
      `}</style>

      <DetailsModal
        ad={detailsAd}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        softGradient={softGradient}
        borderColor={borderColor}
        isDark={isDark}
      />

      <Header />

      <main
        className="mx-auto max-w-6xl px-4 py-4"
        style={{
          height: "calc(100vh - 84px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {err && (
          <div className="text-sm rounded-xl p-3 border border-destructive/30 text-destructive bg-card shrink-0">
            {String(err)}
          </div>
        )}

        {/* ✅ Top Card: فقط نام نمایشگاه وسط + سرچ — بدون نام/آیکون کنار */}
        <section
          className="rounded-3xl border p-4 shrink-0"
          style={{ borderColor, background: sectionBg }}
        >
          <div className="flex flex-col items-center gap-3">
            {/* ✅ نمایشگاه وسط‌چین + چشمک آرام */}
            <h1
              className="text-xl font-extrabold text-foreground text-center"
              style={{ animation: "titleGlow 3s ease-in-out infinite" }}
            >
              نمایشگاه {loading ? "..." : user?.username ?? ""}
            </h1>

            {/* ✅ سرچ وسط‌چین */}
            <div className="w-full max-w-[440px] relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در آگهی‌ها..."
                className="w-full h-9 rounded-2xl border pr-10 pl-9 text-sm outline-none text-center"
                style={{
                  borderColor,
                  background: isDark
                    ? "hsl(0 0% 10%)"
                    : "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* دکمه مدیریت — فقط صاحب */}
            {isOwner && (
              <div className="flex items-center gap-2">
                {myRole === "Admin" || myRole === "SuperAdmin" ? (
                  <Link
                    href="/admin"
                    className="rounded-2xl px-4 py-1.5 text-sm border font-semibold"
                    style={{ borderColor, background: softGradient }}
                  >
                    پنل ادمین 🛡️
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="rounded-2xl px-4 py-1.5 text-sm border font-semibold"
                    style={{ borderColor, background: softGradient }}
                  >
                    داشبورد 👤
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Bio + Ads ── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* BIO */}
          <div
            className="lg:col-span-1 rounded-3xl border p-4 flex flex-col overflow-hidden"
            style={{ borderColor, background: sectionBg }}
          >
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold text-foreground">
                بیوگرافی
              </h2>
              {isOwner && (
                <Link
                  href="/dashboard#bio"
                  className="text-sm rounded-xl px-3 py-1.5 border font-semibold"
                  style={{
                    borderColor,
                    background: isDark
                      ? "hsl(0 0% 10%)"
                      : "hsl(var(--background))",
                  }}
                >
                  مدیریت ✍️
                </Link>
              )}
            </div>

            <div
              className="mt-3 space-y-3 overflow-y-auto flex-1"
              style={{ scrollbarWidth: "thin" }}
            >
              {bio.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  هنوز بیوگرافی ثبت نشده.
                </div>
              ) : (
                bio.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border p-3"
                    style={{
                      borderColor,
                      background: isDark
                        ? "hsl(0 0% 10%)"
                        : "hsl(var(--background))",
                    }}
                  >
                    <div
                      className="inline-block rounded-2xl border px-3 py-2 text-sm font-semibold text-foreground"
                      style={{ borderColor, background: softGradient }}
                    >
                      {formatBioLine(b)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {dayjs(b.createdAt)
                        .calendar("jalali")
                        .locale("fa")
                        .format("YYYY/MM/DD")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ADS */}
          <div
            className="lg:col-span-2 rounded-3xl border p-4 flex flex-col overflow-hidden"
            style={{ borderColor, background: sectionBg }}
          >
            <div className="flex items-center justify-between shrink-0 mb-2">
              <span className="text-xs text-muted-foreground">
                {filteredAds.length.toLocaleString("fa-IR")} آگهی
              </span>
              {isOwner && (
                <Link
                  href="/dashboard"
                  className="rounded-xl px-3 py-1.5 text-sm border font-semibold"
                  style={{ borderColor, background: softGradient }}
                >
                  + ثبت آگهی
                </Link>
              )}
            </div>

            {/* ✅ فقط این اسکرول می‌خورد */}
            <div
              className="flex-1 min-h-0 overflow-y-auto pr-0.5"
              style={{ scrollbarWidth: "thin" }}
            >
              {filteredAds.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  {search ? "آگهی‌ای یافت نشد" : "هنوز آگهی‌ای ثبت نشده."}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
                    {filteredAds.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        highlighted={ad.id === highlightAdId}
                        onDetails={(a) => {
                          setDetailsAd(a);
                          setDetailsOpen(true);
                        }}
                        softGradient={softGradient}
                        borderColor={borderColor}
                        chipBg={chipBg}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
