export type NotificationType = "task_created" | "task_updated" | "task_removed";

export type TaskType =
  | "expense_approval"
  | "payment_processing"
  | "expense_correction";

export interface Notification {
  id: string;
  type: NotificationType;
  taskId: string;
  taskType: TaskType;
  message: string;
  requester?: string;
  amount?: number;
  currency?: string;
  timestamp: string; // ISO 8601
  read: boolean;
  metadata?: Record<string, unknown>;
}

export const NOTIFICATION_STORAGE_KEY_PREFIX = "nablafleet_notifications_";
export const MAX_NOTIFICATIONS = 50;
export const NOTIFICATION_TTL_DAYS = 7;
export const TOAST_DURATION_SECONDS = 5;

export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  expense_approval: "\uD83D\uDCBC", // briefcase
  payment_processing: "\uD83D\uDCB0", // money bag
  expense_correction: "\u26A0\uFE0F", // warning
};
