"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { startSignalR } from "@/lib/signalr";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (token) router.replace("/dashboard");
  }, [token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", { username, password });

      const t: string = res.data.token;
      const role: "User" | "Admin" | "SuperAdmin" = res.data.role;

      setAuth({ token: t, role });
      await startSignalR();

      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.response?.data ?? "خطا در ورود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-[1650px] px-2 sm:px-4 py-12">
        <div className="grid place-items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[520px]"
          >
            <Card
              className="rounded-[30px] overflow-hidden"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--card) 85%, transparent), color-mix(in srgb, var(--card) 72%, transparent))",
              }}
            >
              <div
                className="h-1.5 w-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(34,197,94,.55), rgba(56,189,248,.50), rgba(217,70,239,.45))",
                }}
              />

              {/* ✅ عنوان بزرگ حذف شد */}
              <CardHeader className="pb-2">
                <div className="text-sm text-muted-foreground mt-1 text-center">
                  به پنل خود وارد شوید
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      نام کاربری
                    </div>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="rounded-2xl h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      رمز عبور
                    </div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="rounded-2xl h-12"
                    />
                  </div>

                  {err && (
                    <div className="text-sm rounded-2xl p-3 border border-destructive/30 text-destructive">
                      {String(err)}
                    </div>
                  )}

                  {/* ✅ دکمه با Hover لطیف */}
                  <Button
                    disabled={loading}
                    className="w-full rounded-2xl h-12 font-semibold cursor-pointer relative overflow-hidden"
                    style={{
                      color: "var(--foreground)",
                      background:
                        "color-mix(in srgb, var(--card) 92%, transparent)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 [background:linear-gradient(90deg,rgba(34,197,94,.12),rgba(56,189,248,.10),rgba(217,70,239,.10))]" />
                    <span className="relative z-10">
                      {loading ? "در حال ورود..." : "ورود"}
                    </span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  );
}
