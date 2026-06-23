import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://api.smartvanride.com";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = Cookies.get("sv_token");
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("🔌 Socket error:", error.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinTripRoom(tripId: string) {
  const s = getSocket();
  s.emit("joinTrip", { tripId });
}

export default getSocket;
