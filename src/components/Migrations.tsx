import { useState } from "react";
import { GitBranch, Play, Undo2, CheckCircle2, Clock, AlertTriangle, Terminal, ChevronRight, ShieldAlert, Sparkles } from "lucide-react";
import { MIGRATIONS } from "../store/data";
import { cn } from "../utils/cn";

interface Props {
  applied: string[]; // migration ids applied
  onRun: (id: string) => void;
  onRollback: (id: string) => void;
  schemaVersion: string;
}

export default function Migrations({ applied, onRun, onRollback, schemaVersion }: Props) {
  const [logs, setLogs] = useState<{ ts: number; msg: string; kind: "info" | "ok" | "warn" }[]>([
    { ts: Date.now() - 60000, msg: "pulse-store initialized · schema v3 detected", kind: "info" },
    { ts: Date.now() - 45000, msg: "integrity check passed · 6 slices · 0 orphan keys", kind: "ok" },
  ]);
  const [running, setRunning] = useState<string | null>(null);

  const log = (msg: string, kind: "info" | "ok" | "warn" = "info") => setLogs((p) => [...p.slice(-30), { ts: Date.now(), msg, kind }]);

  const run = (id: string) => {
    const m = MIGRATIONS.find((x) => x.id === id)!;
    setRunning(id);
    log(`▶ starting migration ${m.from} → ${m.to} · ${m.title}`, "info");
    setTimeout(() => log(`  · scanning store slices… 6 found`, "info"), 300);
    setTimeout(() => log(`  · transforming ${m.changes.length} field(s)`, "info"), 650);
    setTimeout(() => {
      onRun(id);
      setRunning(null);
      log(`✓ migration ${m.from} → ${m.to} applied · snapshot saved to IndexedDB`, "ok");
      log(`  · dispatching MIGRATION_APPLIED { id: "${id}" }`, "info");
    }, 1100);
  };

  const rollback = (id: string) => {
    const m = MIGRATIONS.find((x) => x.id === id)!;
    log(`↩ rolling back ${m.to} → ${m.from} · restoring snapshot`, "warn");
    setTimeout(() => { onRollback(id); log(`✓ rollback complete · schema back to ${m.from}`, "ok"); }, 700);
  };

  const versions = ["v1", "v2", "v3", "v4", "v5"];
  const currentIdx = versions.indexOf(schemaVersion);

  return (
    <div className="space-y-4">
      {/* Schema stepper */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 slide-up">
        <div className="flex items-center gap-2 mb-5"><GitBranch size={16} className="text-violet-400" /><h2 className="font-bold text-sm text-white">Schema Version</h2><span className="mono text-[10px] text-slate-500 ml-auto">current: <b className="text-violet-300">{schemaVersion}</b></span></div>
        <div className="flex items-center">
          {versions.map((v, i) => {
            const done = i < currentIdx;
            const current = i === currentIdx;
            return (
              <div key={v} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mono text-[12px] font-bold border-2 transition-all", current ? "border-violet-500 bg-violet-500/20 text-violet-200 shadow-lg shadow-violet-900/50" : done ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : "border-slate-700 bg-[#080c14] text-slate-500")}>
                    {done ? <CheckCircle2 size={16} /> : v}
                  </div>
                  <span className={cn("mono text-[10px] mt-1.5", current ? "text-violet-300 font-bold" : done ? "text-emerald-400" : "text-slate-600")}>{current ? "current" : done ? "applied" : "pending"}</span>
                </div>
                {i < versions.length - 1 && <div className={cn("flex-1 h-[3px] mx-2 rounded-full mb-5", i < currentIdx ? "bg-emerald-500" : "bg-slate-800")} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Migration cards */}
        <div className="xl:col-span-2 space-y-3">
          {MIGRATIONS.map((m, idx) => {
            const isApplied = applied.includes(m.id);
            const isNext = !isApplied && (idx === 0 || applied.includes(MIGRATIONS[idx - 1].id));
            const isRunning = running === m.id;
            return (
              <div key={m.id} className={cn("bg-[#111827] border rounded-2xl p-4 slide-up transition-colors", isApplied ? "border-emerald-500/30" : isNext ? "border-violet-500/40" : "border-slate-800 opacity-70")} style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[11px] font-bold text-white bg-[#080c14] border border-slate-700 rounded-lg px-2 py-1">{m.from} <ChevronRight size={11} className="inline text-slate-500" /> {m.to}</span>
                  <h3 className="font-bold text-sm text-white">{m.title}</h3>
                  <span className={cn("mono text-[9px] uppercase tracking-wider border rounded-full px-2 py-0.5 ml-auto", m.risk === "low" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" : m.risk === "medium" ? "text-amber-300 bg-amber-500/10 border-amber-500/30" : "text-red-300 bg-red-500/10 border-red-500/30")}>
                    {m.risk === "high" ? <ShieldAlert size={10} className="inline mr-1" /> : null}{m.risk} risk
                  </span>
                  {isApplied && <span className="mono text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5 flex items-center gap-1"><CheckCircle2 size={11} /> applied</span>}
                  {isNext && !isApplied && <span className="mono text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-full px-2 py-0.5 flex items-center gap-1"><Sparkles size={11} /> next up</span>}
                </div>
                <p className="text-[12.5px] text-slate-400 mt-2 leading-relaxed">{m.description}</p>
                <div className="mt-3 space-y-1">
                  {m.changes.map((c, i) => (
                    <div key={i} className="mono text-[11px] text-slate-400 flex items-start gap-2"><span className="text-violet-400 mt-px">▸</span>{c}</div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {!isApplied ? (
                    <button onClick={() => run(m.id)} disabled={!isNext || isRunning} className="flex items-center gap-1.5 mono text-[11px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg px-3.5 py-2 font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all">
                      {isRunning ? <Clock size={13} className="animate-spin" /> : <Play size={13} />} {isRunning ? "Migrating…" : `Run ${m.from} → ${m.to}`}
                    </button>
                  ) : (
                    <button onClick={() => rollback(m.id)} disabled={!m.reversible} className="flex items-center gap-1.5 mono text-[11px] bg-[#080c14] border border-slate-700 text-slate-300 rounded-lg px-3.5 py-2 hover:border-amber-500 disabled:opacity-40" title={m.reversible ? "Restore pre-migration snapshot" : "Irreversible migration"}>
                      <Undo2 size={13} /> Rollback to {m.from}
                    </button>
                  )}
                  {!m.reversible && <span className="mono text-[10px] text-amber-400 flex items-center gap-1"><AlertTriangle size={11} /> irreversible — snapshot only</span>}
                  {isRunning && <div className="flex-1 min-w-[120px] h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-pulse" style={{ width: "70%" }} /></div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Console */}
        <div className="bg-[#0a0f1a] border border-slate-800 rounded-2xl overflow-hidden slide-up h-fit" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-[#0d1420]">
            <Terminal size={15} className="text-emerald-400" /><h3 className="font-bold text-sm text-white">Migration Console</h3>
            <button onClick={() => setLogs([])} className="ml-auto mono text-[10px] text-slate-500 hover:text-slate-300">clear</button>
          </div>
          <div className="p-4 space-y-2 max-h-[420px] overflow-auto mono text-[11px] leading-relaxed">
            {logs.length === 0 && <div className="text-slate-600">— console cleared —</div>}
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-600 shrink-0">{new Date(l.ts).toLocaleTimeString()}</span>
                <span className={cn("break-all", l.kind === "ok" ? "text-emerald-300" : l.kind === "warn" ? "text-amber-300" : "text-slate-400")}>{l.msg}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-800 mono text-[10px] text-slate-600">Every migration dispatches <span className="text-violet-300">MIGRATION_APPLIED</span> and persists a pre-migration snapshot to IndexedDB <span className="text-slate-400">pulse-db / snapshots</span>.</div>
        </div>
      </div>
    </div>
  );
}
