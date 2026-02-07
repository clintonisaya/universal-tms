"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type {
  Notification,
  NotificationType,
  TaskType,
} from "@/types/notification";
import {
  NOTIFICATION_STORAGE_KEY_PREFIX,
  MAX_NOTIFICATIONS,
  NOTIFICATION_TTL_DAYS,
} from "@/types/notification";

// ---------------------------------------------------------------------------
// Constants & Cache
// ---------------------------------------------------------------------------

const EMPTY: Notification[] = [];
const notificationCache = new Map<string, Notification[]>();

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function storageKey(userId: string): string {
  return `${NOTIFICATION_STORAGE_KEY_PREFIX}${userId}`;
}

/** Remove items older than TTL and cap at MAX size (FIFO). */
function cleanup(items: Notification[]): Notification[] {
  const cutoff = Date.now() - NOTIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const fresh = items.filter((n) => new Date(n.timestamp).getTime() > cutoff);
  return fresh.slice(0, MAX_NOTIFICATIONS);
}

function readNotifications(userId: string): Notification[] {
  if (typeof window === "undefined") return EMPTY;

  // Return cached version if available to ensure stable reference
  if (notificationCache.has(userId)) {
    return notificationCache.get(userId)!;
  }

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      notificationCache.set(userId, EMPTY);
      return EMPTY;
    }
    const parsed: Notification[] = JSON.parse(raw);
    const cleaned = cleanup(parsed);
    notificationCache.set(userId, cleaned);
    return cleaned;
  } catch {
    notificationCache.set(userId, EMPTY);
    return EMPTY;
  }
}

function writeNotifications(userId: string, items: Notification[]): void {
  if (typeof window === "undefined") return;
  
  // Update cache first
  notificationCache.set(userId, items);
  
  // Persist
  localStorage.setItem(storageKey(userId), JSON.stringify(items));
  
  // Notify all subscribers that storage changed
  window.dispatchEvent(new Event("notifications-changed"));
}

export function clearNotifications(userId: string): void {
  if (typeof window === "undefined") return;
  
  notificationCache.set(userId, EMPTY);
  localStorage.removeItem(storageKey(userId));
  
  window.dispatchEvent(new Event("notifications-changed"));
}

// ---------------------------------------------------------------------------
// External store for useSyncExternalStore
// ---------------------------------------------------------------------------

function subscribe(callback: () => void): () => void {
  const onNotificationsChanged = () => callback();

  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(NOTIFICATION_STORAGE_KEY_PREFIX)) {
      const userId = e.key.replace(NOTIFICATION_STORAGE_KEY_PREFIX, "");
      // Invalidate cache so next readNotifications calls re-read storage
      notificationCache.delete(userId);
      callback();
    }
  };

  window.addEventListener("notifications-changed", onNotificationsChanged);
  window.addEventListener("storage", onStorage);
  
  return () => {
    window.removeEventListener("notifications-changed", onNotificationsChanged);
    window.removeEventListener("storage", onStorage);
  };
}

// Server snapshot (SSR)
function getServerSnapshot(): Notification[] {
  return EMPTY;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface AddNotificationPayload {
  type: NotificationType;
  taskId: string;
  taskType: TaskType;
  message: string;
  requester?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export function useNotifications(userId: string | undefined) {
  // Stable snapshot function to prevent infinite loops
  const getSnapshot = useCallback(() => {
    return userId ? readNotifications(userId) : EMPTY;
  }, [userId]);

  const notifications = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const addNotification = useCallback(
    (payload: AddNotificationPayload): Notification | undefined => {
      if (!userId) return undefined;
      // Read mostly from cache now
      const existing = readNotifications(userId);
      const newItem: Notification = {
        id: crypto.randomUUID(),
        ...payload,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const updated = [newItem, ...existing].slice(0, MAX_NOTIFICATIONS);
      writeNotifications(userId, updated);
      return newItem;
    },
    [userId],
  );

  const markAsRead = useCallback(
    (notificationId: string) => {
      if (!userId) return;
      const existing = readNotifications(userId);
      const updated = existing.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      );
      writeNotifications(userId, updated);
    },
    [userId],
  );

  const markAllRead = useCallback(() => {
    if (!userId) return;
    const existing = readNotifications(userId);
    const updated = existing.map((n) => ({ ...n, read: true }));
    writeNotifications(userId, updated);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllRead,
  } as const;
}