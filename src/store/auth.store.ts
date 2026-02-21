import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setApiToken } from "@/lib/api";

type Role = "User" | "Admin" | "SuperAdmin";

type AuthState = {
  token: string | null;
  role: Role | null;
  userId: number | null;
  username: string | null;
  setAuth: (payload: {
    token: string;
    role: Role;
    userId?: number;
    username?: string;
  }) => void;
  clear: () => void;
};

function decodeJwt(token: string): {
  userId?: number;
  role?: Role;
  username?: string;
} {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const userId = Number(json.userId ?? json.sub);
    const role = (json[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ] ?? json.role) as Role | undefined;
    const username = json.username as string | undefined;
    return {
      userId: Number.isFinite(userId) ? userId : undefined,
      role,
      username,
    };
  } catch {
    return {};
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      role: null,
      userId: null,
      username: null,

      setAuth: ({ token, role, userId, username }) => {
        const decoded = decodeJwt(token);
        const finalUserId = userId ?? decoded.userId ?? null;
        const finalRole = role ?? decoded.role ?? null;
        const finalUsername = username ?? decoded.username ?? null;

        setApiToken(token);
        set({
          token,
          role: finalRole,
          userId: finalUserId,
          username: finalUsername,
        });
      },

      clear: () => {
        setApiToken(null);
        set({ token: null, role: null, userId: null, username: null });
      },
    }),
    {
      name: "carads_auth",
      onRehydrateStorage: () => (state) => {
        // وقتی از localStorage برگشت، توکن رو روی axios ست کن
        if (state?.token) setApiToken(state.token);
      },
    }
  )
);
