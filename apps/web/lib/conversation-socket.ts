import { io } from "socket.io-client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function createConversationSocket() {
  return io(`${apiUrl}/conversations`, {
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket", "polling"],
  });
}
