import { useEffect, useMemo, useState } from "react";
import { Database, Clock, Layers, Search, Plus, Trash2, Copy, Check, Pencil, Eraser, HardDrive, ShieldCheck, X } from "lucide-react";
import type { StorageEntry } from "../store/types";
import { cn } from "../utils/cn";
import { formatBytesKB, SEED_STORAGE } from "../store/data";

type StoreKind = "local" | "session" | "indexeddb";

const TABS: { id: StoreKind; label: string; icon: any; quotaKB: number; desc: string }[] = [
  { id: "local", label: "localStorage", icon: Database, quotaKB: 5120, desc: "Persistent · survives browser restart" },
  { id: "session", label: "sessionStorage", icon: Clock, quotaKB: 5120, desc: "Per-tab · cleared on tab close" },
  { id: "indexeddb", label: "IndexedDB", icon: Layers, quotaKB: 51200, desc: "Structured · pulse-db object stores" },
];

function expiresLabel(e: StorageEntry) {
  if (!e.expiresAt) return { text: "never expires", cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" };
  const diff = e.expiresAt - Date.now();
  if (diff < 0) return { text: "expired", cls: "text-red-300 bg-red-500/10 border-red-500/30" };
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  const txt = d >= 1 ? `expires in ${d}d ${h % 24}h` : h >= 1 ? `expires in ${h}h` : `expires in ${Math.max(1, Math.floor(diff / 60000))}m`;
  const cls = diff < 3600000 ? "text-amber-300 bg-amber-500/10 border-amber-500/30" : "text-sky-300 bg-sky-500/10 border-sky-500/30";
  return { text: txt, cls };
}

export default function StorageManager() {
  const [entries, setEntries] = useState<StorageEntry[]>(SEED_STORAGE);
  const [tab, setTab] = useState<StoreKind>("local");
  const [search, setSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newTtl, setNewTtl] = useState("never");
  const [toast, setToast] = useState<string | null>(null);

  // Sync local/session entries to real browser storage on mount + changes
  useEffect(() => {
    try {
      entries.filter((e) => e.store === "local").forEach((e) => localStorage.setItem(e.key, e.value));
      entries.filter((e) => e.store === "session").forEach((e) => sessionStorage.setItem(e.key, e.value));
    } catch { /* quota / privacy mode */ }
  }, [entries]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const filtered = useMemo(() => entries.filter((e) => e.store === tab && (e.key.toLowerCase().includes(search.toLowerCase()) || e.value.toLowerCase().includes(search.toLowerCase()))), [entries, tab, search]);
  const tabEntries = useMemo(() => entries.filter((e) => e.store === tab), [entries, tab]);
  const usedKB = useMemo(() => tabEntries.reduce((a, e) => a + e.sizeKB, 0), [tabEntries]);
  const quota = TABS.find((t) => t.id === tab)!.quotaKB;
  const pct = Math.min(100, (usedKB / quota) * 100);

  const addEntry = () => {
    if (!newKey.trim() || !newValue.trim()) { flash("⚠ Key and value are required"); return; }
    const ttlMs = newTtl === "never" ? null : newTtl === "1h" ? 3600000 : newTtl === "24h" ? 86400000 : 86400000 * 7;
    const entry: StorageEntry = { key: newKey.trim(), value: newValue.trim(), sizeKB: Math.max(0.01, (newKey.length + newValue.length) / 1024), createdAt: Date.now(), expiresAt: ttlMs ? Date.now() + ttlMs : null, store: tab, db: tab === "indexeddb" ? "pulse-db" : undefined };
    setEntries((prev) => [entry, ...prev.filter((e) => !(e.store === tab && e.key === entry.key))]);
    setNewKey(""); setNewValue("");
    flash(`✓ ${entry.key} written to ${tab === "indexeddb" ? "IndexedDB" : tab + "Storage"}`);
  };

  const deleteEntry = (key: string) => {
    setEntries((prev) => prev.filter((e) => !(e.store === tab && e.key === key)));
    try { if (tab === "local") localStorage.removeItem(key); if (tab === "session") sessionStorage.removeItem(key); } catch {}
    flash(`🗑 ${key} deleted`);
  };

  const clearAll = () => {
    setEntries((prev) => prev.filter((e) => e.store !== tab));
    try { if (tab === "local") localStorage.clear(); if (tab === "session") sessionStorage.clear(); } catch {}
    setConfirmClear(false);
    flash(`🧹 ${tab} cleared`);
  };

  const saveEdit = (key: string) => {
    setEntries((prev) => prev.map((e) => (e.store === tab && e.key === key ? { ...e, value: editValue, sizeKB: Math.max(0.01, (key.length + editValue.length) / 1024) } : e)));
    setEditingKey(null);
    flash(`✓ ${key} updated`);
  };

  const copy = (key: string, value: string) => { navigator.clipboard?.writeText(value).catch(() => {}); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1200); };

  return (
    <div className="space-y-4">
      {toast && <div className="toast-in mono text-[12px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 rounded-xl px-4 py-2.5">{toast}</div>}

      {/* Tabs + quota */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 slide-up">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setConfirmClear(false); }} className={cn("flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all", tab === t.id ? "border-violet-500/60 bg-violet-500/15" : "border-slate-800 bg-[#0d1420] hover:border-slate-700")}>
              <t.icon size={16} className={tab === t.id ? "text-violet-300" : "text-slate-400"} />
              <span><span className={cn("block text-[13px] font-bold", tab === t.id ? "text-white" : "text-slate-300")}>{t.label}</span><span className="block mono text-[9.5px] text-slate-500">{t.desc}</span></span>
              <span className="mono text-[10px] text-slate-400 bg-[#080c14] border border-slate-800 rounded-full px-2 py-0.5 ml-1">{entries.filter((e) => e.store === t.id).length} keys</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 mono text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1"><ShieldCheck size={12} /> synced to real browser storage</div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 mono text-[11px] text-slate-400"><HardDrive size={14} className="text-indigo-400" /> {formatBytesKB(usedKB)} / {formatBytesKB(quota)} used</div>
          <div className="flex-1 min-w-[160px] h-2.5 bg-slate-800 rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all", pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-gradient-to-r from-violet-500 to-emerald-500")} style={{ width: `${Math.max(2, pct)}%` }} /></div>
          <span className="mono text-[11px] text-slate-400">{pct.toFixed(1)}%</span>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search keys / values…" className="mono text-[11px] bg-[#080c14] border border-slate-700 rounded-lg pl-8 pr-3 py-2 w-52 text-slate-200 outline-none focus:border-violet-500" />
          </div>
          {confirmClear ? (
            <span className="flex items-center gap-1.5">
              <button onClick={clearAll} className="mono text-[11px] bg-red-600 text-white rounded-lg px-3 py-2 font-bold">Confirm clear</button>
              <button onClick={() => setConfirmClear(false)} className="mono text-[11px] bg-[#080c14] border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2"><X size={13} /></button>
            </span>
          ) : (
            <button onClick={() => setConfirmClear(true)} disabled={tabEntries.length === 0} className="flex items-center gap-1.5 mono text-[11px] bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2 hover:bg-red-500/20 disabled:opacity-40"><Eraser size={13} /> Clear all</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Entries */}
        <div className="xl:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden slide-up" style={{ animationDelay: "60ms" }}>
          <div className="px-4 py-3 border-b border-slate-800 bg-[#0d1420] flex items-center gap-2">
            <Database size={15} className="text-violet-400" /><h3 className="font-bold text-sm text-white">{TABS.find((t) => t.id === tab)?.label} entries</h3>
            <span className="mono text-[10px] text-slate-500 ml-auto">{filtered.length} shown</span>
          </div>
          <div className="divide-y divide-slate-800/60 max-h-[520px] overflow-auto">
            {filtered.length === 0 && <div className="py-16 text-center"><Database size={28} className="mx-auto text-slate-700" /><p className="mono text-[12px] text-slate-500 mt-3">No entries found. Add one →</p></div>}
            {filtered.map((e) => {
              const exp = expiresLabel(e);
              return (
                <div key={e.key} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono text-[12.5px] font-bold text-indigo-200 break-all">{e.key}</span>
                    {e.db && <span className="mono text-[9px] text-sky-300 bg-sky-500/10 border border-sky-500/25 rounded-full px-1.5 py-px">{e.db}</span>}
                    <span className={cn("mono text-[9px] border rounded-full px-1.5 py-px", exp.cls)}>{exp.text}</span>
                    <span className="ml-auto flex items-center gap-1 shrink-0">
                      <button onClick={() => copy(e.key, e.value)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10" title="Copy value">{copiedKey === e.key ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}</button>
                      <button onClick={() => { setEditingKey(editingKey === e.key ? null : e.key); setEditValue(e.value); }} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-violet-500/10" title="Edit value"><Pencil size={13} /></button>
                      <button onClick={() => deleteEntry(e.key)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10" title="Delete"><Trash2 size={13} /></button>
                    </span>
                  </div>
                  {editingKey === e.key ? (
                    <div className="mt-2 flex gap-2">
                      <textarea value={editValue} onChange={(ev) => setEditValue(ev.target.value)} rows={2} className="mono text-[11px] flex-1 bg-[#080c14] border border-violet-500 rounded-lg px-3 py-2 text-slate-200 outline-none resize-y" />
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => saveEdit(e.key)} className="mono text-[11px] bg-emerald-600 text-white rounded-lg px-3 py-1.5 font-bold">Save</button>
                        <button onClick={() => setEditingKey(null)} className="mono text-[11px] bg-[#080c14] border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mono text-[11px] text-slate-400 mt-1.5 break-all line-clamp-2">{e.value}</div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mono text-[10px] text-slate-600">
                    <span>size <b className="text-slate-400">{formatBytesKB(e.sizeKB)}</b></span>
                    <span>created {new Date(e.createdAt).toLocaleString()}</span>
                    <span>{e.expiresAt ? `expires ${new Date(e.expiresAt).toLocaleString()}` : "no expiry"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add entry */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 slide-up h-fit" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-3"><Plus size={15} className="text-emerald-400" /><h3 className="font-bold text-sm text-white">Write Entry</h3><span className="mono text-[10px] text-slate-500 ml-auto">→ {tab === "indexeddb" ? "IndexedDB" : tab + "Storage"}</span></div>
          <label className="mono text-[10px] text-slate-500 uppercase tracking-wider">Key</label>
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="pulse:my:key" className="mono text-[12px] w-full mt-1 bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-indigo-200 outline-none focus:border-violet-500" />
          <label className="mono text-[10px] text-slate-500 uppercase tracking-wider block mt-3">Value</label>
          <textarea value={newValue} onChange={(e) => setNewValue(e.target.value)} rows={4} placeholder='{"hello":"world"}' className="mono text-[11px] w-full mt-1 bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-violet-500 resize-y" />
          <label className="mono text-[10px] text-slate-500 uppercase tracking-wider block mt-3">TTL / Expiration</label>
          <select value={newTtl} onChange={(e) => setNewTtl(e.target.value)} className="mono text-[12px] w-full mt-1 bg-[#080c14] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-violet-500">
            <option value="never">Never expires</option>
            <option value="1h">1 hour</option>
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
          </select>
          <button onClick={addEntry} className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm rounded-xl py-2.5 hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-violet-900/40"><Plus size={15} /> Write to storage</button>
          <div className="mt-4 pt-3 border-t border-slate-800 mono text-[10px] text-slate-600 leading-relaxed">
            Entries in local/session tabs are mirrored to the real <span className="text-slate-400">window.localStorage</span> / <span className="text-slate-400">sessionStorage</span> so you can verify them in DevTools → Application.
          </div>
        </div>
      </div>
    </div>
  );
}
