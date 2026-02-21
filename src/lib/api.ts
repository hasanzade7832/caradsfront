import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export const api = axios.create({
  baseURL: API_BASE,
});

export function setApiToken(token?: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}
