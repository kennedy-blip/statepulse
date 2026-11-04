export type StoreState = Record<string, any>;

export interface HistoryEntry {
  id: string;
  index: number;
  type: string;
  payload: any;
  timestamp: number;
  durationMs: number;
  snapshot: StoreState;
  source: "dispatcher" | "patch" | "migration" | "system" | "replay";
}

export interface StorageEntry {
  key: string;
  value: string;
  sizeKB: number;
  createdAt: number;
  expiresAt: number | null; // null = never
  store: "local" | "session" | "indexeddb";
  db?: string;
}

export interface Migration {
  id: string;
  from: string;
  to: string;
  title: string;
  description: string;
  changes: string[];
  risk: "low" | "medium" | "high";
  reversible: boolean;
}

export type TabId = "store" | "timeline" | "storage" | "migrations";
