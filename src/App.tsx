import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Atom, TreeDeciduous, History, Database, GitBranch, RotateCcw, Download, Check, Activity, Zap, Users, HardDrive, Timer, X } from "lucide-react";
import StoreInspector from "./components/StoreInspector";
import ActionTimeline from "./components/ActionTimeline";
import StorageManager from "./components/StorageManager";
import Migrations from "./components/Migrations";
import { INITIAL_STATE, buildSeedHistory, applyAction, clone, formatBytesKB } from "./store/data";
import type { HistoryEntry, StoreState, TabId } from "./store/types";
import { cn } from "./utils/cn";

const TABS: { id: TabId; label: string; icon: any; desc: string }[] = [
  { id: "store", label: "Global Store Tree", icon: TreeDeciduous, desc: "Inspect & edit live state" },
  { id: "timeline", label: "Action Timeline", icon: History, desc: "Replay & time-travel" },
  { id: "storage", label: "Storage Inspector", icon: Database, desc: "local · session · IndexedDB" },
  { id: "migrations", label: "State Migrations", icon: GitBranch, desc: "Schema v1 → v5" },
];

let counter = 2000;

export default function App() {
  const [tab, setTab] = useState<TabId>("store");
  const [state, setState] = useState<StoreState>(() => clone(INITIAL_STATE));
  const [history, setHistory] = useState<HistoryEntry[]>(() => buildSeedHistory());
  const [cursor, setCursor] = useState<number>(() => buildSeedHistory().length - 1);
  const [appliedMigrations, setAppliedMigrations] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [subscribers, setSubscribers] = useState(7);
  const [uptime, setUptime] = useState(0);
  const [latency, setLatency] = useState(3);
  const startRef = useRef(Date.now());

  const toast = useCallback((msg: string) => {
    const id = ++counter;
    setToasts((p) => [...p.slice(-3), { id, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);

  // live heartbeat: subscribers + latency + uptime
  useEffect(() => {
    const id = setInterval(() => {
      setUptime(Math.floor((Date.now() - startRef.current) / 1000));
      setLatency(2 + Math.floor(Math.random() * 6));
      setSubscribers((s) => Math.max(4, Math.min(14, s + (Math.random() > 0.5 ? 1 : -1))));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const stateRef = useRef(state); stateRef.current = state;
  const historyRef = useRef(history); historyRef.current = history;
  const cursorRef = useRef(cursor); cursorRef.current = cursor;

  const dispatch = useCallback((type: string, payload: any, source: HistoryEntry["source"] = "dispatcher") => {
    const next = applyAction(stateRef.current, type, payload);
    const truncated = historyRef.current.slice(0, cursorRef.current + 1);
    const entry: HistoryEntry = {
      id: `act_${++counter}`,
      index: truncated.length,
      type,
      payload: clone(payload ?? {}),
      timestamp: Date.now(),
      durationMs: 2 + Math.floor(Math.random() * 16),
      snapshot: clone(next),
      source,
    };
    setState(next);
    setHistory([...truncated, entry]);
    setCursor(truncated.length);
    toast(`⚡ ${type} dispatched`);
  }, [toast]);

  const patch = useCallback((path: string[], value: any) => {
    dispatch("__PATCH__", { path, value }, "patch");
  }, [dispatch]);

  const jump = useCallback((index: number) => {
    const target = historyRef.current[index];
    if (target) setState(clone(target.snapshot));
    setCursor(index);
  }, []);

  const jumpToLive = useCallback(() => {
    const live = historyRef.current[historyRef.current.length - 1];
    if (live) setState(clone(live.snapshot));
    setCursor(historyRef.current.length - 1);
    toast("↩ Returned to live state");
  }, [toast]);

  const resetStore = useCallback(() => {
    const fresh = clone(INITIAL_STATE);
    const init: HistoryEntry = { id: `act_${++counter}`, index: 0, type: "@@INIT", payload: { store: "pulse-store", version: "3.2.0", reset: true }, timestamp: Date.now(), durationMs: 3, snapshot: clone(fresh), source: "system" };
    setState(fresh);
    setHistory([init]);
    setCursor(0);
    setAppliedMigrations([]);
    toast("⟲ Store reset to initial state");
  }, [toast]);

  const exportSnapshot = useCallback(() => {
    const snapshot = { exportedAt: new Date().toISOString(), schemaVersion, cursor, state, history: history.map((h) => ({ index: h.index, type: h.type, payload: h.payload, timestamp: h.timestamp })) };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `statepulse-snapshot-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard?.writeText(JSON.stringify(state, null, 2)).catch(() => {});
    toast("⬇ Snapshot exported & copied to clipboard");
  }, [state, history, cursor, toast]);

  const runMigration = useCallback((id: string) => {
    const s = clone(stateRef.current);
    if (id === "m1") { s.user.plan = "pro"; s.user.preferences.timezone = s.user.preferences.timezone || "UTC"; s.user.isAuthenticated = true; }
    if (id === "m2") { s.cart.items = s.cart.items.map((i: any) => ({ id: i.id, name: i.name, priceCents: Math.round((i.price ?? (i.priceCents ? i.priceCents / 100 : 0)) * 100), qty: i.qty })); s.cart.totalCents = s.cart.items.reduce((a: number, i: any) => a + i.priceCents * i.qty, 0); s.cart.currency = s.cart.currency || "USD"; }
    if (id === "m3") { s.settings.experiments = s.settings.experiments || { newTreeView: true, aiSuggestions: false }; s.session.mfaEnabled = true; s.session.device = s.session.device || "Unknown device"; }
    if (id === "m4") { s.analytics.consent = "granted"; s.analytics.conversions = s.analytics.conversions ?? 47; s.ui.selectedSlice = s.ui.selectedSlice || "user"; }
    const truncated = historyRef.current.slice(0, cursorRef.current + 1);
    const entry: HistoryEntry = { id: `act_${++counter}`, index: truncated.length, type: "MIGRATION_APPLIED", payload: { id, from: id === "m1" ? "v1" : id === "m2" ? "v2" : id === "m3" ? "v3" : "v4", to: id === "m1" ? "v2" : id === "m2" ? "v3" : id === "m3" ? "v4" : "v5" }, timestamp: Date.now(), durationMs: 18 + Math.floor(Math.random() * 30), snapshot: clone(s), source: "migration" };
    setState(s);
    setHistory([...truncated, entry]);
    setCursor(truncated.length);
    setAppliedMigrations((p) => [...p, id]);
  }, []);

  const rollbackMigration = useCallback((id: string) => {
    setAppliedMigrations((p) => p.filter((x) => x !== id));
    const idx = Math.max(0, historyRef.current.length - 2);
    const target = historyRef.current[idx];
    if (target) setState(clone(target.snapshot));
    setCursor(idx);
    toast(`↩ Rolled back ${id} — restored prior snapshot`);
  }, [toast]);

  const schemaVersion = useMemo(() => {
    const order = ["v3", "v4", "v5"];
    // base v3, m3 -> v4, m4 -> v5 ; m1/m2 are historical (already in v3 baseline) but allow running for demo
    let v = "v3";
    if (appliedMigrations.includes("m3")) v = "v4";
    if (appliedMigrations.includes("m4")) v = "v5";
    void order;
    return v;
  }, [appliedMigrations]);

  const storeKB = useMemo(() => JSON.stringify(state).length / 1024, [state]);
  const isTimeTraveling = cursor !== history.length - 1;
  const fmtUptime = `${Math.floor(uptime / 60)}:${String(uptime % 60).padStart(2, "0")}`;

  const stats = [
    { icon: Activity, label: "Store size", value: formatBytesKB(storeKB), sub: `${Object.keys(state).length} slices`, color: "text-violet-400 bg-violet-500/10 border-violet-500/25" },
    { icon: Zap, label: "Actions dispatched", value: String(history.length), sub: `cursor #${cursor}`, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
    { icon: Users, label: "Subscribers", value: String(subscribers), sub: `${latency}ms latency`, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/25" },
    { icon: HardDrive, label: "Storage used", value: "2.84 MB", sub: "IndexedDB · pulse-db", color: "text-sky-400 bg-sky-500/10 border-sky-500/25" },
    { icon: Timer, label: "Session uptime", value: fmtUptime, sub: "since page load", color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
  ];

  return (
    <div className="min-h-screen bg-[#080c14] bg-grid relative">
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[520px] h-[320px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-40 -right-32 w-[420px] h-[320px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[380px] h-[260px] bg-emerald-600/[0.06] rounded-full blur-[110px]" />
      </div>

      <div className="relative max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-8 pb-10">
        {/* Header */}
        <header className="sticky top-0 z-40 -mx-3 sm:-mx-5 lg:-mx-8 px-3 sm:px-5 lg:px-8 py-3 bg-[#080c14]/85 backdrop-blur-xl border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center glow-atom">
                  <Atom size={24} className="text-white spin-slow" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080c14] blink" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-none">State<span className="text-violet-400">Pulse</span></h1>
                <p className="mono text-[9.5px] text-slate-500 mt-1 hidden sm:block">store tree · action dispatcher · storage inspector</p>
              </div>
            </div>

            <span className="flex items-center gap-1.5 mono text-[10.5px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" /> Store: Active (Connected)
            </span>
            <span className="mono text-[10px] text-slate-500 hidden md:inline">schema {schemaVersion} · v3.2.0</span>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button onClick={resetStore} className="flex items-center gap-1.5 mono text-[11px] bg-[#111827] border border-slate-700 hover:border-red-500/50 hover:text-red-300 text-slate-300 rounded-xl px-3 py-2 transition-colors"><RotateCcw size={13} /> Reset Store State</button>
              <button onClick={exportSnapshot} className="flex items-center gap-1.5 mono text-[11px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl px-3 py-2 font-semibold hover:brightness-110 shadow-lg shadow-violet-900/40 transition-all"><Download size={13} /> Export Store Snapshot</button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-2 rounded-xl border px-3.5 py-2.5 whitespace-nowrap transition-all shrink-0", tab === t.id ? "border-violet-500/60 bg-violet-500/15 shadow-lg shadow-violet-900/20" : "border-slate-800 bg-[#111827] hover:border-slate-700")}>
                <t.icon size={15} className={tab === t.id ? "text-violet-300" : "text-slate-400"} />
                <span className="text-left"><span className={cn("block text-[12.5px] font-bold leading-tight", tab === t.id ? "text-white" : "text-slate-300")}>{t.label}</span><span className="block mono text-[9px] text-slate-500 leading-tight">{t.desc}</span></span>
                {t.id === "timeline" && <span className="mono text-[10px] bg-violet-600 text-white rounded-full px-1.5 py-px font-bold">{history.length}</span>}
              </button>
            ))}
          </nav>
        </header>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mt-5">
          {stats.map((s, i) => (
            <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3 slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", s.color)}><s.icon size={16} /></div>
              <div className="min-w-0">
                <div className="mono text-[9.5px] uppercase tracking-wider text-slate-500 truncate">{s.label}</div>
                <div className="text-[15px] font-extrabold text-white leading-tight truncate">{s.value}</div>
                <div className="mono text-[9.5px] text-slate-500 truncate">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {isTimeTraveling && (
          <div className="mt-4 flex flex-wrap items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 slide-up">
            <History size={16} className="text-amber-300" />
            <p className="text-[12.5px] text-amber-200">You are viewing a historical snapshot <b className="mono">#{cursor}</b> — edits here will fork the timeline.</p>
            <button onClick={jumpToLive} className="ml-auto mono text-[11px] bg-amber-500 text-[#080c14] font-bold rounded-lg px-3 py-1.5 hover:bg-amber-400">Return to live →</button>
          </div>
        )}

        {/* Main */}
        <main className="mt-5">
          {tab === "store" && <StoreInspector state={state} onPatch={patch} onDispatch={(t, p) => dispatch(t, p)} isTimeTraveling={isTimeTraveling} />}
          {tab === "timeline" && <ActionTimeline history={history} cursor={cursor} onJump={jump} onJumpToLive={jumpToLive} />}
          {tab === "storage" && <StorageManager />}
          {tab === "migrations" && <Migrations applied={appliedMigrations} onRun={runMigration} onRollback={rollbackMigration} schemaVersion={schemaVersion} />}
        </main>

        <footer className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 mono text-[10px] text-slate-600 border-t border-slate-800/80 pt-4">
          <span>StatePulse v3.2.0</span><span>·</span><span>pulse-store</span><span>·</span><span>schema {schemaVersion}</span><span>·</span><span>{history.length} actions</span><span>·</span><span>latency {latency}ms</span>
          <span className="ml-auto flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" /> all systems operational</span>
        </footer>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 w-[calc(100vw-2rem)] max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in flex items-start gap-2 bg-[#111827] border border-violet-500/40 rounded-xl px-4 py-3 shadow-2xl shadow-black/50">
            <Check size={15} className="text-emerald-400 shrink-0 mt-px" />
            <span className="mono text-[11.5px] text-slate-200 break-all flex-1">{t.msg}</span>
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="text-slate-500 hover:text-slate-300 shrink-0"><X size={13} /></button>
          </div>
        ))}
      </div>

    </div>
  );
}
