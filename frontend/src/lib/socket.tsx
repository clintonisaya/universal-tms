"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // In production, connect through the same origin (frontend proxies to backend)
    // In development, connect directly to backend
    const isDev = process.env.NODE_ENV === "development";
    const socketUrl = isDev
      ? "http://localhost:8000"
      : window.location.origin;

    const socketInstance = io(socketUrl, {
      path: "/socket.io/",
      transports: ["polling", "websocket"], // Start with polling, upgrade to WebSocket
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
