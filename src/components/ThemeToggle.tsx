"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // ✅ همه hookها همیشه اجرا میشن
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ✅ فقط UI رو بعد از mount دقیق نشون بده، ولی کامپوننت رو return نکن قبل از hookها
  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-10 rounded-2xl cursor-pointer"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title="تغییر تم"
      aria-label="تغییر تم"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
