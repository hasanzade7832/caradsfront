import * as signalR from "@microsoft/signalr";
import { useAuthStore } from "@/store/auth.store";

let connection: signalR.HubConnection | null = null;

export function getConnection() {
  return connection;
}

export async function startSignalR() {
  if (connection && connection.state === signalR.HubConnectionState.Connected)
    return connection;

  const token = useAuthStore.getState().token;
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL!;

  console.log("HUB URL =>", hubUrl); // ✅ فقط برای تست

  connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token ?? "",
    })
    .withAutomaticReconnect()
    .build();

  connection.onclose((e) => console.log("SignalR closed:", e));
  connection.onreconnecting((e) => console.log("SignalR reconnecting:", e));
  connection.onreconnected((id) => console.log("SignalR reconnected:", id));

  await connection.start();
  console.log("SignalR connected. state =", connection.state);

  return connection;
}

export async function stopSignalR() {
  if (!connection) return;
  await connection.stop();
  connection = null;
}

export async function joinProfile(userId: number) {
  const conn = await startSignalR();
  await conn.invoke("JoinProfile", String(userId));
}

export async function leaveProfile(userId: number) {
  const conn = await startSignalR();
  await conn.invoke("LeaveProfile", String(userId));
}

export type TelegramMsg = {
  text: string;
  senderName: string;
  sentAt: string;
};
