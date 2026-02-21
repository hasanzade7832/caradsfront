"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { startSignalR } from "@/lib/signalr";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Search, X, Eye, Users, Car, FileText, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import jalaliday from "jalaliday";

dayjs.extend(jalaliday);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Ad = {
  id: number;
  userId: number;
  type: number | string;
  title: string;
  year: number;
  color: string;
  mileageKm: number;
  price: number;
  gearbox: number | string;
  createdAt: string;
  insuranceMonths?: number | null;
  chassisNumber?: string;
  contactPhone?: string;
  description?: string;
  viewCount: number;
};

type UserInfo = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
};

type TelegramMsg = {
  id: string; // client-side UUID برای key
  text: string;
  senderName: string;
  sentAt: string;
};

// ─────────────────────────────────────────────
// Label helpers
// ─────────────────────────────────────────────
const TYPE_NUM: Record<string, string> = {
  "1": "فروش کارکرده",
  "2": "فروش همکاری",
  "3": "درخواست خرید",
  "4": "فروش صفر",
};
const TYPE_STR: Record<string, string> = {
  usedsale: "فروش کارکرده",
  coopsale: "فروش همکاری",
  buyrequest: "درخواست خرید",
  zerosale: "فروش صفر",
};
function typeLabel(t: number | string): string {
  const s = String(t).toLowerCase().replace(/\s/g, "");
  return TYPE_NUM[s] ?? TYPE_STR[s] ?? "نامشخص";
}

const GEAR_NUM: Record<string, string> = {
  "0": "—",
  "1": "اتومات",
  "2": "دنده‌ای",
};
const GEAR_STR: Record<string, string> = {
  none: "—",
  automatic: "اتومات",
  manual: "دنده‌ای",
};
function gearboxLabel(g: number | string): string {
  const s = String(g).toLowerCase().replace(/\s/g, "");
  return GEAR_NUM[s] ?? GEAR_STR[s] ?? "—";
}

function priceToText(v: number): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const billion = Math.floor(n / 1000);
  const rem = n - billion * 1000;
  const million = Math.floor(rem);
  const thousand = Math.round((rem - million) * 1000);
  const toFa = (x: number) => x.toLocaleString("fa-IR");
  const parts: string[] = [];
  if (billion > 0) parts.push(`${toFa(billion)} میلیارد`);
  if (million > 0) parts.push(`${toFa(million)} میلیون`);
  if (thousand > 0) parts.push(`${toFa(thousand)} هزار`);
  return parts.length ? parts.join(" و ") + " تومان" : "—";
}

// ─────────────────────────────────────────────
// Description Modal
// ─────────────────────────────────────────────
function DescModal({
  ad,
  open,
  onClose,
  borderColor,
  isDark,
}: {
  ad: Ad | null;
  open: boolean;
  onClose: () => void;
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
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.52)",
              backdropFilter: "blur(4px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div
              className="w-full max-w-sm rounded-3xl border p-5 shadow-2xl"
              style={{
                borderColor,
                background: isDark
                  ? "linear-gradient(180deg,rgba(15,15,15,.98),rgba(8,8,8,.99))"
                  : "hsl(var(--card))",
                maxHeight: "70vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4" dir="rtl">
                <div>
                  <h2 className="text-sm font-extrabold text-foreground">
                    {ad.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    توضیحات آگهی
                  </p>
                </div>
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
              <div
                className="rounded-2xl border px-4 py-3"
                style={{
                  borderColor,
                  background: isDark
                    ? "hsl(0 0% 10%)"
                    : "hsl(var(--background))",
                }}
                dir="rtl"
              >
                <p className="text-sm text-foreground leading-8 whitespace-pre-wrap">
                  {ad.description?.trim() || "—"}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// AdRow — fixed: no big spacer, vertical divider
// between توضیحات and username, wider desc button,
// tooltip z-index fix
// ─────────────────────────────────────────────
function AdRow({
  ad,
  userInfo,
  isNew,
  flashCount,
  selected,
  onViewClick,
  onSelect,
  onDescClick,
  softGradient,
  greenGradient,
  borderColor,
  cardBg,
  chipBg,
  isDark,
}: {
  ad: Ad;
  userInfo?: UserInfo;
  isNew: boolean;
  flashCount: number;
  selected: boolean;
  onViewClick: (ad: Ad) => void;
  onSelect: (ad: Ad) => void;
  onDescClick: (ad: Ad) => void;
  softGradient: string;
  greenGradient: string;
  borderColor: string;
  cardBg: string;
  chipBg: string;
  isDark: boolean;
}) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState<"green" | "blue">("green");
  const prevFlash = useRef(0);
  const [hoveredView, setHoveredView] = useState(false);

  useEffect(() => {
    if (!isNew) return;
    const t1 = setTimeout(() => {
      setFlashColor("green");
      setIsFlashing(true);
    }, 650);
    const t2 = setTimeout(() => setIsFlashing(false), 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isNew]);

  useEffect(() => {
    if (flashCount > 0 && flashCount !== prevFlash.current) {
      prevFlash.current = flashCount;
      setFlashColor("blue");
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 2000);
    }
  }, [flashCount]);

  const flashBorder =
    flashColor === "green" ? "rgba(34,197,94,0.9)" : "rgba(56,189,248,0.9)";
  const flashShadow =
    flashColor === "green"
      ? "0 0 0 2px rgba(34,197,94,0.45), 0 0 30px rgba(34,197,94,0.22)"
      : "0 0 0 2px rgba(56,189,248,0.45), 0 0 30px rgba(56,189,248,0.22)";
  const flashAnim = flashColor === "green" ? "rowFlashGreen" : "rowFlashBlue";
  const hasDesc = !!ad.description?.trim();
  const gb = gearboxLabel(ad.gearbox);

  // chip style — plain, no tooltip
  const chip = (content: React.ReactNode) => (
    <span
      className="text-xs font-semibold whitespace-nowrap shrink-0"
      style={{ background: chipBg, borderRadius: 8, padding: "2px 7px" }}
    >
      {content}
    </span>
  );

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div
        className="relative rounded-[14px] border cursor-pointer"
        onClick={() => onSelect(ad)}
        style={{
          borderColor: selected
            ? "rgba(56,189,248,0.7)"
            : isFlashing
            ? flashBorder
            : borderColor,
          background: selected
            ? isDark
              ? "rgba(56,189,248,0.08)"
              : "rgba(56,189,248,0.05)"
            : cardBg,
          boxShadow: selected
            ? "0 0 0 1.5px rgba(56,189,248,0.35)"
            : isFlashing
            ? flashShadow
            : "none",
          animation:
            !selected && isFlashing
              ? `${flashAnim} 0.38s ease-in-out infinite alternate`
              : "none",
          transition: "box-shadow 0.12s, border-color 0.12s, background 0.12s",
          overflow: "hidden",
        }}
      >
        {isFlashing && !selected && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]"
            style={{ zIndex: 0 }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  flashColor === "green"
                    ? "linear-gradient(90deg,transparent,rgba(34,197,94,0.09),transparent)"
                    : "linear-gradient(90deg,transparent,rgba(56,189,248,0.09),transparent)",
                animation: "shimmerSlide 0.55s linear infinite",
              }}
            />
          </div>
        )}

        {/*
          Layout (RTL): [نام+نوع] | [chips+قیمت وسط‌چین] | [username + بازدید]
          سه ستون: راست، وسط (flex-1 + justify-center)، چپ
        */}
        <div
          className="relative z-10 flex items-center px-3 py-2"
          style={{ direction: "rtl", gap: 8, minWidth: 0 }}
        >
          {/* ── ستون راست: نام + نوع ── */}
          <div
            className="flex items-center gap-1.5 shrink-0"
            style={{ maxWidth: 200 }}
          >
            <span className="font-bold text-sm text-foreground truncate leading-tight">
              {ad.title}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0"
              style={{ background: softGradient }}
            >
              {typeLabel(ad.type)}
            </span>
          </div>

          {/* divider */}
          <div
            className="shrink-0 h-4 w-px opacity-20"
            style={{ background: "currentColor" }}
          />

          {/* ── ستون وسط: chips + قیمت + توضیحات — وسط‌چین ── */}
          <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 overflow-hidden">
            {chip(ad.year)}
            {chip(ad.color)}
            {chip(`${Number(ad.mileageKm).toLocaleString("fa-IR")} km`)}
            {gb !== "—" && chip(gb)}
            {/* قیمت */}
            <span
              className="text-xs font-extrabold whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-xl border"
              style={{ borderColor, background: softGradient }}
            >
              {priceToText(ad.price)}
            </span>
            {/* دکمه توضیحات */}
            <button
              type="button"
              disabled={!hasDesc}
              onClick={(e) => {
                if (!hasDesc) return;
                e.stopPropagation();
                onDescClick(ad);
              }}
              className="flex items-center gap-1 text-[11px] rounded-lg border font-semibold whitespace-nowrap shrink-0 select-none outline-none"
              style={{
                minWidth: 82,
                padding: "3px 10px",
                borderColor: hasDesc
                  ? borderColor
                  : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
                background: hasDesc
                  ? isDark
                    ? "rgba(148,163,184,0.10)"
                    : "rgba(148,163,184,0.10)"
                  : isDark
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.02)",
                color: hasDesc
                  ? isDark
                    ? "rgba(203,213,225,0.85)"
                    : "rgba(71,85,105,0.9)"
                  : isDark
                  ? "rgba(255,255,255,0.22)"
                  : "rgba(0,0,0,0.22)",
                cursor: hasDesc ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!hasDesc) return;
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = isDark
                  ? "rgba(148,163,184,0.20)"
                  : "rgba(148,163,184,0.20)";
                b.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                if (!hasDesc) return;
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = isDark
                  ? "rgba(148,163,184,0.10)"
                  : "rgba(148,163,184,0.10)";
                b.style.transform = "none";
              }}
            >
              <FileText className="h-3 w-3 opacity-60 shrink-0" />
              توضیحات
            </button>
          </div>

          {/* divider */}
          <div
            className="shrink-0 h-4 w-px opacity-20"
            style={{ background: "currentColor" }}
          />

          {/* ── ستون چپ: username + بازدید ── */}
          <div className="flex items-center gap-1.5 shrink-0">
            {userInfo && (
              <span
                className="text-[11px] font-bold px-2 py-1 rounded-xl border whitespace-nowrap"
                style={{ borderColor, background: softGradient }}
              >
                {userInfo.username}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewClick(ad);
              }}
              onMouseEnter={() => setHoveredView(true)}
              onMouseLeave={() => setHoveredView(false)}
              className="text-xs px-3 py-1.5 rounded-xl border font-bold whitespace-nowrap select-none outline-none shrink-0"
              style={{
                borderColor: hoveredView ? "rgba(34,197,94,0.8)" : borderColor,
                background: hoveredView
                  ? greenGradient
                  : isDark
                  ? "hsl(0 0% 12%)"
                  : "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                cursor: "pointer",
                transform: hoveredView
                  ? "translateY(-1px) scale(1.03)"
                  : "none",
                boxShadow: hoveredView
                  ? "0 4px 16px rgba(34,197,94,0.25)"
                  : "none",
                transition: "all 0.18s",
              }}
            >
              بازدید از خودرو
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// SitePanel — پنل پیام‌های تلگرام
// ─────────────────────────────────────────────
function SitePanel({
  borderColor,
  softGradient,
  isDark,
  messages,
}: {
  borderColor: string;
  softGradient: string;
  isDark: boolean;
  messages: TelegramMsg[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bg = isDark
    ? "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.20) 100%)"
    : "linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,transparent),color-mix(in srgb,var(--card) 86%,transparent))";

  // اسکرول خودکار به آخرین پیام
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className="rounded-[22px] border h-full flex flex-col overflow-hidden"
      style={{ borderColor, background: bg }}
    >
      {/* هدر */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0 border-b"
        style={{ borderColor, direction: "rtl" }}
      >
        <div
          className="h-9 w-9 rounded-xl border grid place-items-center shrink-0"
          style={{ borderColor, background: softGradient }}
        >
          <Send className="h-4 w-4 opacity-80" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-extrabold text-foreground">
            پیام‌های گروه تلگرام
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            پیام‌های زنده از گروه
          </p>
        </div>
        {/* badge تعداد */}
        {messages.length > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: softGradient }}
          >
            {messages.length}
          </span>
        )}
      </div>

      {/* لیست پیام‌ها */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1"
        style={{ scrollbarWidth: "thin", direction: "rtl" }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 opacity-35">
            <Send className="h-7 w-7" />
            <p className="text-xs font-semibold">
              منتظر پیام از گروه تلگرام...
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
              >
                {/* ردیف پیام — یه خط، مثل آگهی‌ها */}
                <div
                  className="flex items-center gap-2 rounded-[10px] border px-3 py-1.5"
                  style={{
                    borderColor,
                    background: isDark
                      ? "linear-gradient(90deg,rgba(56,189,248,0.04),rgba(217,70,239,0.03))"
                      : "linear-gradient(90deg,rgba(56,189,248,0.05),rgba(217,70,239,0.03))",
                    direction: "rtl",
                  }}
                >
                  {/* نام فرستنده */}
                  <span
                    className="text-[11px] font-extrabold whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded-lg"
                    style={{ background: softGradient }}
                  >
                    {msg.senderName}
                  </span>

                  {/* divider */}
                  <div
                    className="shrink-0 h-3.5 w-px opacity-20"
                    style={{ background: "currentColor" }}
                  />

                  {/* متن پیام — flex-1 تا جا بشه */}
                  <span
                    className="text-xs text-foreground flex-1 min-w-0 leading-relaxed"
                    style={{ wordBreak: "break-word" }}
                  >
                    {msg.text}
                  </span>

                  {/* divider */}
                  <div
                    className="shrink-0 h-3.5 w-px opacity-20"
                    style={{ background: "currentColor" }}
                  />

                  {/* ساعت */}
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 font-mono">
                    {msg.sentAt}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  const softGradient = useMemo(
    () =>
      isDark
        ? "linear-gradient(90deg,rgba(34,197,94,.56),rgba(56,189,248,.48),rgba(217,70,239,.46))"
        : "linear-gradient(90deg,rgba(34,197,94,.22),rgba(56,189,248,.18),rgba(217,70,239,.16))",
    [isDark]
  );
  const greenGradient = useMemo(
    () =>
      isDark
        ? "linear-gradient(90deg,rgba(34,197,94,.65),rgba(34,197,94,.45))"
        : "linear-gradient(90deg,rgba(34,197,94,.35),rgba(34,197,94,.20))",
    [isDark]
  );
  const borderColor = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb, hsl(var(--border)) 65%, rgba(255,255,255,.18) 35%)"
        : "hsl(var(--border))",
    [isDark]
  );
  const sectionBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.20) 100%)"
        : "linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,transparent),color-mix(in srgb,var(--card) 86%,transparent))",
    [isDark]
  );
  const cardBg = useMemo(
    () =>
      isDark
        ? "linear-gradient(180deg,rgba(255,255,255,.033) 0%,rgba(255,255,255,.016) 55%,rgba(0,0,0,.16) 100%)"
        : "linear-gradient(180deg,color-mix(in srgb,var(--card) 94%,transparent),color-mix(in srgb,var(--card) 86%,transparent))",
    [isDark]
  );
  const chipBg = useMemo(
    () =>
      isDark
        ? "color-mix(in srgb,rgba(255,255,255,.08) 70%,rgba(0,0,0,.35) 30%)"
        : "color-mix(in srgb,hsl(var(--foreground)) 7%,hsl(var(--background)) 93%)",
    [isDark]
  );

  // ── State ──
  const [ads, setAds] = useState<Ad[]>([]);
  const [users, setUsers] = useState<Record<number, UserInfo>>({});
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [flashCounts, setFlashCounts] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [todayViews, setTodayViews] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [descAd, setDescAd] = useState<Ad | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  // پیام‌های تلگرام — حداکثر ۲۰۰ پیام نگه می‌داریم
  const [telegramMsgs, setTelegramMsgs] = useState<TelegramMsg[]>([]);

  const fetchedUserIds = useRef<Set<number>>(new Set());
  function fetchUser(userId: number) {
    if (fetchedUserIds.current.has(userId)) return;
    fetchedUserIds.current.add(userId);
    api
      .get(`/api/users/${userId}`)
      .then((r) =>
        setUsers((prev) => ({
          ...prev,
          [userId]: {
            id: r.data.id,
            username: r.data.username,
            firstName: r.data.firstName,
            lastName: r.data.lastName,
          },
        }))
      )
      .catch(() => {
        fetchedUserIds.current.delete(userId);
      });
  }

  useEffect(() => {
    api.get("/api/ads").then((res) => {
      const list: Ad[] = res.data ?? [];
      setAds(list);
      [...new Set(list.map((a) => a.userId))].forEach(fetchUser);
    });
    api
      .get("/api/ads/stats/today")
      .then((r) => setTodayViews(r.data?.todayViews ?? 0))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    let pollTimer: any = null;

    const startTelegramPolling = () => {
      if (pollTimer) return;

      pollTimer = setInterval(async () => {
        try {
          const res = await api.get("/api/telegram/messages");
          const list = res.data ?? [];

          setTelegramMsgs(() => {
            const mapped: TelegramMsg[] = (list as any[]).map((m, idx) => ({
              id: `${idx}-${m.sentAt}-${m.senderName}-${m.text}`,
              text: m.text,
              senderName: m.senderName,
              sentAt: m.sentAt,
            }));
            return mapped.slice(-200);
          });
        } catch (e) {
          console.log("Polling error:", e);
        }
      }, 2000);

      console.log("Telegram polling started");
    };

    const stopTelegramPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      console.log("Telegram polling stopped");
    };

    (async () => {
      try {
        const conn = await startSignalR();
        console.log("SignalR connected, stop polling");
        stopTelegramPolling();

        // اگر SignalR قطع شد، polling فعال شود
        conn.onclose(() => {
          console.log("SignalR closed, start polling");
          startTelegramPolling();
        });

        // ✅ پیام‌های تلگرام
        const onTelegramMessage = (p: {
          text: string;
          senderName: string;
          sentAt: string;
        }) => {
          const newMsg: TelegramMsg = {
            id: `${Date.now()}-${Math.random()}`,
            text: p.text,
            senderName: p.senderName,
            sentAt: p.sentAt,
          };
          setTelegramMsgs((prev) => {
            const updated = [...prev, newMsg];
            return updated.length > 200 ? updated.slice(-200) : updated;
          });
        };

        // بقیه handlerهای خودت (همون‌هایی که الان داری) رو نگه دار
        // فقط این خط تلگرام حتماً باید باشه:
        conn.on("TelegramMessage", onTelegramMessage);

        // (اختیاری) آنلاین
        try {
          await conn.invoke("GetOnlineCount");
        } catch {}

        unsub = () => {
          conn.off("TelegramMessage", onTelegramMessage);
        };
      } catch (err) {
        console.log("SignalR failed, enabling polling...", err);
        startTelegramPolling();
      }
    })();

    return () => {
      unsub?.();
      stopTelegramPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewClick = useCallback(
    async (ad: Ad) => {
      setFlashCounts((prev) => ({ ...prev, [ad.id]: (prev[ad.id] ?? 0) + 1 }));
      try {
        const res = await api.post(`/api/ads/${ad.id}/view`);
        const newCount = res.data?.viewCount ?? Number(ad.viewCount) + 1;
        setAds((prev) =>
          prev.map((x) => (x.id === ad.id ? { ...x, viewCount: newCount } : x))
        );
        window.dispatchEvent(
          new CustomEvent("carads_view_updated", {
            detail: { adId: ad.id, viewCount: newCount },
          })
        );
      } catch {}
      await new Promise((r) => setTimeout(r, 700));
      router.push(`/u/${ad.userId}?ad=${ad.id}`);
    },
    [router]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return ads;
    const q = search.trim().toLowerCase();
    return ads.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.color.toLowerCase().includes(q) ||
        String(a.year).includes(q) ||
        typeLabel(a.type).includes(q) ||
        priceToText(a.price).includes(q)
    );
  }, [ads, search]);

  useEffect(() => {
    if (selectedAd) {
      const updated = ads.find((a) => a.id === selectedAd.id);
      if (updated) setSelectedAd(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads]);

  return (
    <>
      <style>{`
        @keyframes rowFlashGreen {
          from { box-shadow: 0 0 0 2px rgba(34,197,94,0.45), 0 0 18px rgba(34,197,94,0.18); }
          to   { box-shadow: 0 0 0 3px rgba(34,197,94,0.92), 0 0 38px rgba(34,197,94,0.44); }
        }
        @keyframes rowFlashBlue {
          from { box-shadow: 0 0 0 2px rgba(56,189,248,0.45), 0 0 18px rgba(56,189,248,0.18); }
          to   { box-shadow: 0 0 0 3px rgba(56,189,248,0.92), 0 0 38px rgba(56,189,248,0.44); }
        }
        @keyframes shimmerSlide {
          from { transform: translateX(100%); }
          to   { transform: translateX(-100%); }
        }
      `}</style>

      <DescModal
        ad={descAd}
        open={descOpen}
        onClose={() => setDescOpen(false)}
        borderColor={borderColor}
        isDark={isDark}
      />
      <Header />

      <main
        className="mx-auto max-w-[1800px] px-2 sm:px-4 py-3"
        style={{ height: "calc(100vh - 84px)", overflow: "hidden" }}
      >
        <div
          className="rounded-[26px] border flex flex-col h-full overflow-hidden p-3 sm:p-4"
          style={{ borderColor, background: sectionBg }}
        >
          {/* Search */}
          <div className="flex justify-center shrink-0">
            <div className="w-full max-w-[520px] relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو: نام، رنگ، سال، قیمت، نوع آگهی..."
                className="w-full h-10 rounded-2xl border pr-10 pl-9 text-sm outline-none text-center"
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
          </div>

          <div
            className="mt-2.5 h-px opacity-25 shrink-0"
            style={{ background: "hsl(var(--border))" }}
          />

          {/* layout: list left + panel right */}
          <div
            className="flex-1 min-h-0 flex gap-3 mt-2"
            style={{ direction: "ltr" }}
          >
            {/* list — overflow-y scroll, overflow-x hidden, overflow visible on children for tooltips */}
            <div
              className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-1"
              style={{ scrollbarWidth: "thin" }}
            >
              <div className="space-y-1">
                {filtered.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 opacity-40 py-20">
                    <Car className="h-8 w-8" />
                    <div className="text-sm font-semibold">
                      آگهی‌ای یافت نشد
                    </div>
                  </div>
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {filtered.map((ad) => (
                      <AdRow
                        key={ad.id}
                        ad={ad}
                        userInfo={users[ad.userId]}
                        isNew={newIds.has(ad.id)}
                        flashCount={flashCounts[ad.id] ?? 0}
                        selected={selectedAd?.id === ad.id}
                        onViewClick={handleViewClick}
                        onSelect={(a) =>
                          setSelectedAd((prev) =>
                            prev?.id === a.id ? null : a
                          )
                        }
                        onDescClick={(a) => {
                          setDescAd(a);
                          setDescOpen(true);
                        }}
                        softGradient={softGradient}
                        greenGradient={greenGradient}
                        borderColor={borderColor}
                        cardBg={cardBg}
                        chipBg={chipBg}
                        isDark={isDark}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* right panel — 800px */}
            <div className="shrink-0" style={{ width: 800 }}>
              <SitePanel
                borderColor={borderColor}
                softGradient={softGradient}
                isDark={isDark}
                messages={telegramMsgs}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="mt-2 pt-2 flex items-center justify-between gap-3 flex-wrap shrink-0"
            style={{ borderTop: `1px solid hsl(var(--border) / 0.25)` }}
          >
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-2xl border text-xs font-bold"
              style={{ borderColor, background: softGradient }}
            >
              <Car className="h-3.5 w-3.5" />
              <span>{filtered.length.toLocaleString("fa-IR")} آگهی فعال</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold"
                style={{
                  borderColor,
                  background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                }}
              >
                <Eye className="h-3.5 w-3.5 opacity-70" />
                <span>بازدید امروز:</span>
                <span style={{ color: "rgb(56,189,248)" }}>
                  {todayViews.toLocaleString("fa-IR")}
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold"
                style={{
                  borderColor,
                  background: isDark ? "hsl(0 0% 10%)" : "hsl(var(--card))",
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{
                    background: "rgb(34,197,94)",
                    boxShadow: "0 0 6px rgba(34,197,94,0.8)",
                    animation: "pulse 2s infinite",
                  }}
                />
                <Users className="h-3.5 w-3.5 opacity-70" />
                <span>آنلاین:</span>
                <span style={{ color: "rgb(34,197,94)" }}>
                  {onlineCount.toLocaleString("fa-IR")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
