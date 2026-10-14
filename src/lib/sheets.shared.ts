// Client-safe tab metadata (no server imports).
export const TABS = {
  profiles: ["id", "name", "location", "phone", "photo_url", "created_at", "updated_at", "user_id"],
  investments: ["id", "investor_id", "amount", "date", "created_at"],
  cashouts: ["id", "investor_id", "amount", "date", "note", "created_at"],
  requests: ["id", "type", "status", "from_user_id", "to_user_id", "project_id", "data", "created_at", "resolved_at", "resolved_by"],
  projects: ["id", "name", "estimated_investment", "estimated_profit", "actual_profit", "status", "images", "started_at", "completed_at", "created_at", "updated_at", "notes", "manager_id", "description"],
  project_steps: ["id", "project_id", "reason", "amount", "proof_images", "date", "created_at", "notes", "updated_at"],
  project_sales: ["id", "project_id", "name", "amount", "date", "created_at", "updated_at"],
  profit_distributions: ["id", "project_id", "investor_id", "snapshot_id", "status", "profit_amount", "locked_amount", "notes", "resolved_at", "created_at"],
  percentage_snapshots: ["id", "project_id", "investor_id", "percentage", "locked_amount", "created_at"],
  bill_causes: ["id", "name", "created_at"],
  chat_messages: ["id", "project_id", "sender_id", "message", "created_at"],
  chat_read_receipts: ["id", "message_id", "reader_id", "read_at"],
} as const;

export type TabName = keyof typeof TABS;
