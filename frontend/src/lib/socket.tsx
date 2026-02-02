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
    // Determine the socket URL. 
    // If running via Next.js proxy (rewrites), we might connect to /api/socket.io or just root.
    // Ideally use env var, fallback to window.location.origin if API is same domain (proxy).
    // For now assuming standard development setup where API might be on localhost:8000
    
    // Check if NEXT_PUBLIC_API_URL is defined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    // If apiUrl has /api/v1, strip it for the root
    const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, "");

    const socketInstance = io(baseUrl, {
      path: "/socket.io/",
      transports: ["websocket"],
      reconnectionAttempts: 5,
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
