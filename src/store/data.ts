import type { StoreState, HistoryEntry, StorageEntry, Migration } from "./types";

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const INITIAL_STATE: StoreState = {
  user: {
    id: "usr_9f3k2a",
    name: "Ava Chen",
    email: "ava@pulse.dev",
    role: "admin",
    isAuthenticated: true,
    plan: "pro",
    preferences: {
      language: "en-US",
      timezone: "America/Los_Angeles",
      compactMode: false,
    },
  },
  cart: {
    items: [
      { id: "sku_001", name: "Pulse Pro License", price: 129, qty: 1 },
      { id: "sku_002", name: "DevTools Add-on", price: 49, qty: 2 },
      { id: "sku_003", name: "Team Seats ×5", price: 21, qty: 1 },
    ],
    total: 248.5,
    currency: "USD",
    coupon: "PULSE20",
    isCheckoutOpen: false,
  },
  settings: {
    theme: "dark",
    density: "comfortable",
    autoSave: true,
    notifications: {
      email: true,
      push: false,
      sms: true,
      weeklyDigest: true,
    },
    experiments: {
      newTreeView: true,
      aiSuggestions: false,
    },
  },
  session: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.pulse",
    expiresAt: "2026-12-31T23:59:59Z",
    refreshCount: 3,
    mfaEnabled: true,
    device: "MacBook Pro · Chrome 131",
  },
  analytics: {
    pageViews: 1248,
    eventsTracked: 342,
    conversions: 47,
    lastActive: "2026-05-13T09:42:18Z",
    consent: "granted",
  },
  ui: {
    sidebarOpen: true,
    activeModal: null,
    toastQueue: [],
    selectedSlice: "user",
  },
};

export function buildSeedHistory(): HistoryEntry[] {
  const now = Date.now();
  const snapshots: { type: string; payload: any; mutate: (s: StoreState) => void; offsetSec: number }[] = [
    { type: "@@INIT", payload: { store: "pulse-store", version: "3.2.0" }, offsetSec: 0, mutate: () => {} },
    { type: "AUTH_LOGIN_SUCCESS", payload: { userId: "usr_9f3k2a", provider: "github", mfa: true }, offsetSec: 42, mutate: (s) => { s.user.isAuthenticated = true; s.user.name = "Ava Chen"; s.user.email = "ava@pulse.dev"; } },
    { type: "CART_ADD_ITEM", payload: { item: { id: "sku_002", name: "DevTools Add-on", price: 49 }, qty: 2 }, offsetSec: 118, mutate: (s) => { s.cart.items[1].qty = 2; s.cart.total = 248.5; } },
    { type: "SETTINGS_TOGGLE_DARK_MODE", payload: { theme: "dark" }, offsetSec: 204, mutate: (s) => { s.settings.theme = "dark"; } },
    { type: "CART_APPLY_COUPON", payload: { code: "PULSE20", discountPct: 20 }, offsetSec: 311, mutate: (s) => { s.cart.coupon = "PULSE20"; } },
    { type: "SESSION_REFRESH_TOKEN", payload: { refreshCount: 3, expiresIn: "24h" }, offsetSec: 402, mutate: (s) => { s.session.refreshCount = 3; } },
    { type: "ANALYTICS_TRACK_EVENT", payload: { event: "checkout_started", page: "/checkout" }, offsetSec: 489, mutate: (s) => { s.analytics.eventsTracked = 342; s.analytics.pageViews = 1248; } },
  ];
  let state = clone(INITIAL_STATE);
  // start from a slightly earlier state for INIT then mutate forward — for simplicity all snapshots derive from INITIAL with progressive tweaks already encoded
  return snapshots.map((snap, i) => {
    if (i > 0) snap.mutate(state);
    return {
      id: `act_${1000 + i}`,
      index: i,
      type: snap.type,
      payload: snap.payload,
      timestamp: now - (snapshots[snapshots.length - 1].offsetSec - snap.offsetSec) * 1000,
      durationMs: 2 + Math.floor(Math.random() * 18),
      snapshot: clone(state),
      source: "system" as const,
    };
  });
}

export const SEED_STORAGE: StorageEntry[] = [
  { key: "pulse:auth:token", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOWYzazJhIiwicm9sZSI6ImFkbWluIn0.signature", sizeKB: 0.42, createdAt: Date.now() - 86400000 * 2, expiresAt: Date.now() + 86400000 * 18, store: "local" },
  { key: "pulse:settings:theme", value: JSON.stringify({ theme: "dark", density: "comfortable", autoSave: true }), sizeKB: 0.08, createdAt: Date.now() - 86400000 * 5, expiresAt: null, store: "local" },
  { key: "pulse:cart:draft", value: JSON.stringify({ items: 3, total: 248.5, coupon: "PULSE20", updatedAt: "2026-05-13T09:42:18Z" }), sizeKB: 0.21, createdAt: Date.now() - 3600000 * 3, expiresAt: Date.now() + 3600000 * 21, store: "local" },
  { key: "pulse:featureFlags", value: JSON.stringify({ newTreeView: true, aiSuggestions: false, betaTimeline: true }), sizeKB: 0.12, createdAt: Date.now() - 86400000, expiresAt: null, store: "local" },
  { key: "pulse:session:tabId", value: "tab_8f2c-91aa-4e2b", sizeKB: 0.03, createdAt: Date.now() - 3600000, expiresAt: Date.now() + 3600000 * 2, store: "session" },
  { key: "pulse:session:scroll", value: JSON.stringify({ path: "/store", y: 842, restored: true }), sizeKB: 0.06, createdAt: Date.now() - 1800000, expiresAt: Date.now() + 3600000, store: "session" },
  { key: "pulse:session:formDraft", value: JSON.stringify({ dispatcherType: "CART_ADD_ITEM", payload: "{\"qty\":1}" }), sizeKB: 0.09, createdAt: Date.now() - 900000, expiresAt: Date.now() + 3600000 * 4, store: "session" },
  { key: "pulse:analytics:queue", value: JSON.stringify([{ e: "page_view", p: "/store" }, { e: "cart_add", p: "sku_002" }]), sizeKB: 0.18, createdAt: Date.now() - 600000, expiresAt: Date.now() + 3600000 * 6, store: "session" },
  { key: "snapshots", value: JSON.stringify({ db: "pulse-db", store: "snapshots", records: 128, lastWrite: "2026-05-13T09:42:18Z" }), sizeKB: 12.4, createdAt: Date.now() - 86400000 * 3, expiresAt: null, store: "indexeddb", db: "pulse-db" },
  { key: "actionLog", value: JSON.stringify({ db: "pulse-db", store: "actionLog", records: 342, compressed: true }), sizeKB: 48.2, createdAt: Date.now() - 86400000 * 3, expiresAt: null, store: "indexeddb", db: "pulse-db" },
  { key: "offlineQueue", value: JSON.stringify({ db: "pulse-db", store: "offlineQueue", pending: 2, retryIn: "45s" }), sizeKB: 3.1, createdAt: Date.now() - 3600000 * 5, expiresAt: Date.now() + 86400000, store: "indexeddb", db: "pulse-db" },
  { key: "mediaCache", value: JSON.stringify({ db: "pulse-db", store: "mediaCache", blobs: 14, bytes: 2840000 }), sizeKB: 2773, createdAt: Date.now() - 86400000 * 7, expiresAt: Date.now() + 86400000 * 30, store: "indexeddb", db: "pulse-db" },
];

export const MIGRATIONS: Migration[] = [
  { id: "m1", from: "v1", to: "v2", title: "User profile enrichment", description: "Adds plan tier and display metadata to the user slice. Backfills defaults for existing accounts.", changes: ["user.plan: string = 'free' → 'pro' for admins", "user.preferences.timezone: added (default UTC)", "user.isAuthenticated: boolean added"], risk: "low", reversible: true },
  { id: "m2", from: "v2", to: "v3", title: "Cart pricing in cents", description: "Migrates cart item prices from float dollars to integer cents to eliminate rounding drift.", changes: ["cart.items[].price → priceCents (×100, rounded)", "cart.total → totalCents (recomputed)", "cart.currency: added (default USD)"], risk: "medium", reversible: true },
  { id: "m3", from: "v3", to: "v4", title: "Settings experiments & session MFA", description: "Introduces feature-experiment flags and MFA state on the session slice.", changes: ["settings.experiments: { newTreeView, aiSuggestions }", "session.mfaEnabled: boolean = true", "session.device: string added"], risk: "low", reversible: true },
  { id: "m4", from: "v4", to: "v5", title: "Analytics consent & flattening", description: "Adds explicit consent tracking and normalizes analytics counters.", changes: ["analytics.consent: 'granted' | 'pending'", "analytics.conversions: number added", "ui.selectedSlice: string added"], risk: "high", reversible: false },
];

export function applyAction(state: StoreState, type: string, payload: any): StoreState {
  const s = clone(state);
  switch (type) {
    case "AUTH_LOGIN_SUCCESS":
      s.user.isAuthenticated = true;
      if (payload?.name) s.user.name = payload.name;
      if (payload?.email) s.user.email = payload.email;
      if (payload?.role) s.user.role = payload.role;
      s.session.refreshCount = (s.session.refreshCount || 0) + 1;
      break;
    case "AUTH_LOGOUT":
      s.user.isAuthenticated = false;
      s.session.token = "revoked";
      break;
    case "CART_ADD_ITEM": {
      const item = payload?.item || { id: `sku_${Math.floor(Math.random() * 900 + 100)}`, name: payload?.name || "New Item", price: payload?.price ?? 29 };
      const qty = payload?.qty ?? 1;
      const existing = s.cart.items.find((i: any) => i.id === item.id);
      if (existing) existing.qty += qty; else s.cart.items.push({ ...item, qty });
      s.cart.total = round2(s.cart.items.reduce((a: number, i: any) => a + (i.price ?? (i.priceCents ? i.priceCents / 100 : 0)) * i.qty, 0));
      break;
    }
    case "CART_REMOVE_ITEM": {
      const id = payload?.itemId || s.cart.items[0]?.id;
      s.cart.items = s.cart.items.filter((i: any) => i.id !== id);
      s.cart.total = round2(s.cart.items.reduce((a: number, i: any) => a + (i.price ?? (i.priceCents ? i.priceCents / 100 : 0)) * i.qty, 0));
      break;
    }
    case "CART_CLEAR":
      s.cart.items = []; s.cart.total = 0; s.cart.coupon = null;
      break;
    case "CART_APPLY_COUPON":
      s.cart.coupon = payload?.code || "PULSE20";
      break;
    case "SETTINGS_TOGGLE_DARK_MODE":
      s.settings.theme = s.settings.theme === "dark" ? "light" : "dark";
      break;
    case "SETTINGS_SET_THEME":
      s.settings.theme = payload?.theme || "dark";
      break;
    case "SETTINGS_TOGGLE_NOTIFICATION": {
      const ch = payload?.channel || "push";
      s.settings.notifications[ch] = !s.settings.notifications[ch];
      break;
    }
    case "USER_UPDATE_ROLE":
      s.user.role = payload?.role || "editor";
      break;
    case "USER_UPDATE_PREFERENCES":
      s.user.preferences = { ...s.user.preferences, ...(payload?.preferences || {}) };
      break;
    case "SESSION_REFRESH_TOKEN":
      s.session.refreshCount = (s.session.refreshCount || 0) + 1;
      s.session.token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Math.random().toString(36).slice(2, 10)}`;
      break;
    case "UI_TOGGLE_SIDEBAR":
      s.ui.sidebarOpen = !s.ui.sidebarOpen;
      break;
    case "ANALYTICS_TRACK_EVENT":
      s.analytics.eventsTracked = (s.analytics.eventsTracked || 0) + 1;
      s.analytics.pageViews = (s.analytics.pageViews || 0) + 1;
      s.analytics.lastActive = new Date().toISOString();
      break;
    case "__PATCH__": {
      const path: string[] = payload.path;
      let cur = s;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = payload.value;
      // keep cart total consistent if qty/price changed
      if (path[0] === "cart" && s.cart?.items) s.cart.total = round2(s.cart.items.reduce((a: number, i: any) => a + (i.price ?? (i.priceCents ? i.priceCents / 100 : 0)) * (i.qty || 0), 0));
      break;
    }
    default:
      // generic: merge payload into state root if object
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        for (const k of Object.keys(payload)) {
          if (k in s && typeof s[k] === "object" && typeof payload[k] === "object") s[k] = { ...s[k], ...payload[k] };
          else s[k] = payload[k];
        }
      }
  }
  return s;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function diffStates(a: StoreState, b: StoreState, prefix = ""): { path: string; from: any; to: any }[] {
  const out: { path: string; from: any; to: any }[] = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  keys.forEach((k) => {
    const p = prefix ? `${prefix}.${k}` : k;
    const va = a?.[k], vb = b?.[k];
    if (va && vb && typeof va === "object" && typeof vb === "object" && !Array.isArray(va) && !Array.isArray(vb)) out.push(...diffStates(va, vb, p));
    else if (JSON.stringify(va) !== JSON.stringify(vb)) out.push({ path: p, from: va, to: vb });
  });
  return out;
}

export function formatBytesKB(kb: number) {
  if (kb < 1) return `${Math.round(kb * 1024)} B`;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

export function validateValue(path: string[], value: any, original: any): string | null {
  const key = path[path.length - 1];
  if (key === "email" && typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
  if (key === "role" && !["admin", "editor", "viewer", "guest"].includes(value)) return "Role must be admin / editor / viewer / guest";
  if (key === "theme" && !["dark", "light", "system"].includes(value)) return "Theme must be dark / light / system";
  if ((key === "price" || key === "total" || key === "pageViews" || key === "eventsTracked" || key === "qty" || key === "refreshCount") && typeof value === "number" && value < 0) return "Number cannot be negative";
  if (typeof original === "string" && typeof value === "string" && value.trim() === "") return "String cannot be empty";
  if (key === "id" && typeof value === "string" && value.trim() === "") return "ID cannot be empty";
  return null;
}
