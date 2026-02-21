// src/lib/errorText.ts
export function errorToText(err: any): string {
  try {
    // axios style
    const data = err?.response?.data;

    // اگر string بود همون
    if (typeof data === "string") return data;

    // اگر آرایه بود
    if (Array.isArray(data)) {
      return data
        .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
        .join("\n");
    }

    // ASP.NET Core ProblemDetails / ValidationProblemDetails
    // { title, status, detail, errors, traceId, ... }
    if (data && typeof data === "object") {
      const title = data.title || data.Title;
      const detail = data.detail || data.Detail;

      // errors: { Field: ["msg1","msg2"], ... }
      const errors = data.errors || data.Errors;
      if (errors && typeof errors === "object") {
        const parts: string[] = [];
        for (const k of Object.keys(errors)) {
          const v = (errors as any)[k];
          if (Array.isArray(v)) parts.push(`${k}: ${v.join(" | ")}`);
          else if (typeof v === "string") parts.push(`${k}: ${v}`);
          else parts.push(`${k}: ${JSON.stringify(v)}`);
        }
        const errText = parts.join("\n");
        return [title, detail, errText].filter(Boolean).join("\n");
      }

      // اگر فقط title/detail داشت
      const msg = [title, detail].filter(Boolean).join("\n");
      if (msg) return msg;

      // fallback
      return JSON.stringify(data);
    }

    // fallback های دیگر
    const msg =
      err?.message ||
      err?.toString?.() ||
      "خطای نامشخص. لطفاً دوباره تلاش کنید.";
    return String(msg);
  } catch {
    return "خطای نامشخص. لطفاً دوباره تلاش کنید.";
  }
}
