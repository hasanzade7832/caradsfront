"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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
      await api.post("/api/auth/register", {
        firstName,
        lastName,
        username,
        phone,
        email,
        password,
      });

      router.replace("/login");
    } catch (e: any) {
      setErr(e?.response?.data ?? "خطا در ثبت‌نام");
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
            className="w-full max-w-[680px]"
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
                  اطلاعات خود را وارد کنید
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">نام</div>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="rounded-2xl h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        نام خانوادگی
                      </div>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="rounded-2xlops
                        2xl h-12"
                      />
                    </div>
                  </div>

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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        شماره تلفن
                      </div>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="rounded-2xl h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">ایمیل</div>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        type="email"
                        className="rounded-2xl h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      رمز عبور
                    </div>
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      type="password"
                      className="rounded-2xl h-12"
                    />
                  </div>

                  {err && (
                    <div className="text-sm rounded-2xl p-3 border border-destructive/30 text-destructive">
                      {String(err)}
                    </div>
                  )}

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
                      {loading ? "در حال ثبت..." : "ثبت‌نام"}
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
