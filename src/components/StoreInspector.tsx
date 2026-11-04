import { useMemo, useState } from "react";
import { Search, TreeDeciduous, Code2, Send, Zap, ShoppingCart, Moon, User, RefreshCw, Bell, LogOut, LogIn, BarChart3, PanelLeft, Copy, Check, Database, Activity, ChevronRight, Trash2 } from "lucide-react";
import JsonTree from "./JsonTree";
import { cn } from "../utils/cn";
import { formatBytesKB } from "../store/data";

interface Props {
  state: Record<string, any>;
  onPatch: (path: string[], value: any) => void;
  onDispatch: (type: string, payload: any) => void;
  isTimeTraveling: boolean;
}

const PRESETS = [
  { type: "AUTH_LOGIN_SUCCESS", label: "Login Success", icon: LogIn, color: "text-violet-300 bg-violet-500/10 border-violet-500/30", payload: () => ({ userId: "usr_9f3k2a", provider: "github", mfa: true }) },
  { type: "AUTH_LOGOUT", label: "Logout", icon: LogOut, color: "text-red-300 bg-red-500/10 border-red-500/30", payload: () => ({ reason: "user_initiated" }) },
  { type: "CART_ADD_ITEM", label: "Add to Cart", icon: ShoppingCart, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", payload: () => ({ item: { id: `sku_${Math.floor(Math.random() * 900 + 100)}`, name: ["Pulse Pro License", "DevTools Add-on", "Team Seats ×5", "Analytics Pack"][Math.floor(Math.random() * 4)], price: [129, 49, 21, 79][Math.floor(Math.random() * 4)] }, qty: 1 }) },
  { type: "CART_REMOVE_ITEM", label: "Remove Item", icon: Trash2, color: "text-amber-300 bg-amber-500/10 border-amber-500/30", payload: () => ({ itemId: "sku_001" }) },
  { type: "SETTINGS_TOGGLE_DARK_MODE", label: "Toggle Dark Mode", icon: Moon, color: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30", payload: () => ({}) },
  { type: "SETTINGS_TOGGLE_NOTIFICATION", label: "Toggle Push Notif", icon: Bell, color: "text-sky-300 bg-sky-500/10 border-sky-500/30", payload: () => ({ channel: "push" }) },
  { type: "USER_UPDATE_ROLE", label: "Set Role: Editor", icon: User, color: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30", payload: () => ({ role: "editor" }) },
  { type: "SESSION_REFRESH_TOKEN", label: "Refresh Token", icon: RefreshCw, color: "text-teal-300 bg-teal-500/10 border-teal-500/30", payload: () => ({ expiresIn: "24h" }) },
  { type: "UI_TOGGLE_SIDEBAR", label: "Toggle Sidebar", icon: PanelLeft, color: "text-slate-300 bg-slate-500/10 border-slate-500/30", payload: () => ({}) },
  { type: "ANALYTICS_TRACK_EVENT", label: "Track Event", icon: BarChart3, color: "text-lime-300 bg-lime-500/10 border-lime-500/30", payload: () => ({ event: "page_view", page: "/store" }) },
];

export default function StoreInspector({ state, onPatch, onDispatch, isTimeTraveling }: Props) {
  const [search, setSearch] = useState("");
  const [selectedPath, setSelectedPath] = useState<string[]>(["user"]);
  const [view, setView] = useState<"tree" | "raw">("tree");
  const [copied, setCopied] = useState(false);
  const [customType, setCustomType] = useState("CART_ADD_ITEM");
  const [customPayload, setCustomPayload] = useState('{\n  "item": { "id": "sku_099", "name": "Custom Item", "price": 59 },\n  "qty": 1\n}');
  const [customError, setCustomError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const slices = useMemo(() => Object.entries(state).map(([k, v]) => ({ key: k, sizeKB: JSON.stringify(v).length / 1024, keys: typeof v === "object" && v ? Object.keys(v).length : 0, type: Array.isArray(v) ? "array" : typeof v })), [state]);
  const totalKB = useMemo(() => JSON.stringify(state).length / 1024, [state]);

  const selectedValue = useMemo(() => {
    let cur: any = state;
    for (const p of selectedPath) { if (cur == null) return undefined; cur = cur[p]; }
    return cur;
  }, [state, selectedPath]);

  const handlePatch = (path: string[], value: any) => {
    onPatch(path, value);
    setFlash(path.join("."));
    setTimeout(() => setFlash(null), 1800);
  };

  const dispatchCustom = () => {
    let payload: any = {};
    try { payload = customPayload.trim() ? JSON.parse(customPayload) : {}; setCustomError(null); }
    catch { setCustomError("Payload is not valid JSON — fix syntax and retry"); return; }
    if (!customType.trim()) { setCustomError("Action type is required"); return; }
    onDispatch(customType.trim().toUpperCase(), payload);
  };

  const copySelected = () => {
    navigator.clipboard?.writeText(JSON.stringify(selectedValue, null, 2)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Tree panel */}
      <div className="xl:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden slide-up">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-800 bg-[#0d1420]">
          <div className="flex items-center gap-2">
            <TreeDeciduous size={16} className="text-violet-400" />
            <h2 className="font-bold text-sm text-white">Store Tree</h2>
            <span className="mono text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-full px-2 py-0.5">root · {Object.keys(state).length} slices</span>
            {isTimeTraveling && <span className="mono text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5">⏱ time-travel mode</span>}
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter keys / values…" className="mono text-[11px] bg-[#080c14] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 w-44 sm:w-52 text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500" />
            </div>
            <div className="flex bg-[#080c14] border border-slate-700 rounded-lg p-0.5">
              <button onClick={() => setView("tree")} className={cn("flex items-center gap-1 mono text-[11px] px-2.5 py-1 rounded-md", view === "tree" ? "bg-violet-600 text-white" : "text-slate-400")}><TreeDeciduous size={12} /> Tree</button>
              <button onClick={() => setView("raw")} className={cn("flex items-center gap-1 mono text-[11px] px-2.5 py-1 rounded-md", view === "raw" ? "bg-violet-600 text-white" : "text-slate-400")}><Code2 size={12} /> Raw JSON</button>
            </div>
          </div>
        </div>

        {/* breadcrumb */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800/60 bg-[#0a0f1a] overflow-x-auto">
          <span className="mono text-[10px] text-slate-500 shrink-0">PATH</span>
          <button onClick={() => setSelectedPath([])} className="mono text-[11px] text-indigo-300 hover:underline shrink-0">store</button>
          {selectedPath.map((p, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight size={11} className="text-slate-600" />
              <button onClick={() => setSelectedPath(selectedPath.slice(0, i + 1))} className={cn("mono text-[11px]", i === selectedPath.length - 1 ? "text-violet-300 font-bold" : "text-slate-400 hover:text-slate-200")}>{p}</button>
            </span>
          ))}
          <span className="ml-auto mono text-[10px] text-slate-500 shrink-0 hidden sm:block">{formatBytesKB(totalKB)} total</span>
        </div>

        {flash && <div className="mx-4 mt-3 mono text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg px-3 py-2 flex items-center gap-2"><Check size={13} /> Patched <b>{flash}</b> — action dispatched to timeline</div>}

        <div className="p-3 sm:p-4 max-h-[560px] overflow-auto">
          {view === "tree" ? (
            <div>
              {Object.entries(state).map(([k, v]) => (
                <JsonTree key={k} label={k} value={v} path={[k]} selectedPath={selectedPath} onSelect={setSelectedPath} onPatch={handlePatch} search={search} defaultOpen />
              ))}
              {search && Object.keys(state).every((k) => !JSON.stringify(state[k]).toLowerCase().includes(search.toLowerCase()) && !k.toLowerCase().includes(search.toLowerCase())) && (
                <div className="text-center py-10 text-slate-500 mono text-xs">No keys match “{search}”</div>
              )}
            </div>
          ) : (
            <pre className="mono text-[11.5px] leading-relaxed text-slate-300 whitespace-pre-wrap break-all">{JSON.stringify(state, null, 2)}</pre>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-800 bg-[#0d1420] flex flex-wrap gap-x-4 gap-y-1 mono text-[10px] text-slate-500">
          <span><span className="text-emerald-300">“string”</span> string</span>
          <span><span className="text-amber-300">42</span> number</span>
          <span><span className="text-violet-300">true</span> boolean</span>
          <span className="ml-auto">Double-click any primitive to edit inline · Enter to commit · Esc to cancel</span>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Slices */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 slide-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-2 mb-3"><Database size={15} className="text-indigo-400" /><h3 className="font-bold text-sm text-white">State Slices</h3><span className="ml-auto mono text-[10px] text-slate-500">{formatBytesKB(totalKB)}</span></div>
          <div className="space-y-2">
            {slices.map((s) => (
              <button key={s.key} onClick={() => setSelectedPath([s.key])} className={cn("w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors", selectedPath[0] === s.key ? "border-violet-500/50 bg-violet-500/10" : "border-slate-800 bg-[#0d1420] hover:border-slate-700")}>
                <span className="mono text-[12px] font-bold text-indigo-300 w-20 truncate">{s.key}</span>
                <span className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden"><span className="block h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${Math.min(100, (s.sizeKB / Math.max(...slices.map(x => x.sizeKB), 0.01)) * 100)}%` }} /></span>
                <span className="mono text-[10px] text-slate-400">{formatBytesKB(s.sizeKB)}</span>
                <span className="mono text-[10px] text-slate-600">{s.keys} keys</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected node */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 slide-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-2"><Activity size={15} className="text-emerald-400" /><h3 className="font-bold text-sm text-white">Selected Node</h3>
            <button onClick={copySelected} className="ml-auto flex items-center gap-1 mono text-[10px] text-slate-400 hover:text-emerald-300 border border-slate-700 rounded-lg px-2 py-1">{copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />} copy value</button>
          </div>
          <div className="mono text-[11px] text-violet-300 bg-[#080c14] border border-slate-800 rounded-lg px-3 py-2 break-all">store.{selectedPath.join(".") || "(root)"}</div>
          <pre className="mono text-[11px] leading-relaxed text-slate-300 bg-[#080c14] border border-slate-800 rounded-lg px-3 py-2.5 mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(selectedValue, null, 2) ?? "undefined"}</pre>
        </div>

        {/* Dispatcher */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 slide-up" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-2 mb-3"><Send size={15} className="text-violet-400" /><h3 className="font-bold text-sm text-white">Action Dispatcher</h3><span className="ml-auto mono text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-full px-2 py-0.5 flex items-center gap-1"><Zap size={10} /> live</span></div>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button key={p.type} onClick={() => onDispatch(p.type, p.payload())} className={cn("flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left hover:brightness-125 active:scale-[0.98] transition-all", p.color)}>
                <p.icon size={14} className="shrink-0" />
                <span className="min-w-0"><span className="block text-[11px] font-semibold leading-tight truncate">{p.label}</span><span className="block mono text-[8.5px] opacity-70 truncate">{p.type}</span></span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <label className="mono text-[10px] text-slate-500 uppercase tracking-wider">Custom action</label>
            <input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="ACTION_TYPE" className="mono text-[12px] w-full mt-1.5 bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-violet-200 outline-none focus:border-violet-500" />
            <textarea value={customPayload} onChange={(e) => setCustomPayload(e.target.value)} rows={4} spellCheck={false} className="mono text-[11px] w-full mt-2 bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-violet-500 resize-y" />
            {customError && <div className="mono text-[11px] text-red-400 mt-1.5">{customError}</div>}
            <button onClick={dispatchCustom} className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl py-2.5 transition-all active:scale-[0.99] shadow-lg shadow-violet-900/40"><Send size={14} /> Dispatch Action</button>
            <p className="mono text-[10px] text-slate-600 mt-2 text-center">Unknown types merge payload keys into the store root.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
