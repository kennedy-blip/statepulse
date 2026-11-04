import { useEffect, useMemo, useRef, useState } from "react";
import { History, Play, Pause, SkipBack, SkipForward, RotateCcw, Clock, Zap, GitCompareArrows, ChevronDown, ChevronUp, Crosshair, Timer } from "lucide-react";
import type { HistoryEntry } from "../store/types";
import { cn } from "../utils/cn";
import { diffStates, timeAgo } from "../store/data";

interface Props {
  history: HistoryEntry[];
  cursor: number;
  onJump: (index: number) => void;
  onJumpToLive: () => void;
}

function categoryOf(type: string): { label: string; cls: string; dot: string } {
  if (type.startsWith("AUTH")) return { label: "auth", cls: "text-violet-300 bg-violet-500/10 border-violet-500/30", dot: "bg-violet-400" };
  if (type.startsWith("CART")) return { label: "cart", cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400" };
  if (type.startsWith("SETTINGS")) return { label: "settings", cls: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30", dot: "bg-indigo-400" };
  if (type.startsWith("SESSION")) return { label: "session", cls: "text-teal-300 bg-teal-500/10 border-teal-500/30", dot: "bg-teal-400" };
  if (type.startsWith("USER")) return { label: "user", cls: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30", dot: "bg-fuchsia-400" };
  if (type.startsWith("ANALYTICS")) return { label: "analytics", cls: "text-lime-300 bg-lime-500/10 border-lime-500/30", dot: "bg-lime-400" };
  if (type.startsWith("__PATCH__")) return { label: "patch", cls: "text-amber-300 bg-amber-500/10 border-amber-500/30", dot: "bg-amber-400" };
  if (type.startsWith("MIGRATION")) return { label: "migration", cls: "text-sky-300 bg-sky-500/10 border-sky-500/30", dot: "bg-sky-400" };
  if (type.startsWith("@@")) return { label: "system", cls: "text-slate-300 bg-slate-500/10 border-slate-500/30", dot: "bg-slate-400" };
  return { label: "custom", cls: "text-orange-300 bg-orange-500/10 border-orange-500/30", dot: "bg-orange-400" };
}

export default function ActionTimeline({ history, cursor, onJump, onJumpToLive }: Props) {
  const [selected, setSelected] = useState<number>(cursor);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSelected(cursor); }, [cursor]);

  useEffect(() => {
    if (!playing) return;
    if (cursor >= history.length - 1) { setPlaying(false); return; }
    const id = setInterval(() => {
      if (cursor >= history.length - 1) { setPlaying(false); return; }
      onJump(cursor + 1);
    }, 1100);
    return () => clearInterval(id);
  }, [playing, cursor, history.length, onJump]);

  const selEntry = history[selected] || history[history.length - 1];
  const prevEntry = selected > 0 ? history[selected - 1] : null;
  const diffs = useMemo(() => {
    if (!selEntry) return [];
    if (!prevEntry) return [{ path: "(root)", from: "—", to: "initial state" }];
    return diffStates(prevEntry.snapshot, selEntry.snapshot);
  }, [selEntry, prevEntry]);

  const isLive = cursor === history.length - 1;

  return (
    <div className="space-y-4">
      {/* Time travel controls */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 slide-up">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-violet-400" />
            <h2 className="font-bold text-sm text-white">Time-Travel Debugger</h2>
            <span className={cn("mono text-[10px] rounded-full px-2 py-0.5 border", isLive ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30")}>
              {isLive ? "● LIVE" : `⏱ viewing #${cursor}`}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <button onClick={() => onJump(Math.max(0, cursor - 1))} disabled={cursor === 0} className="flex items-center gap-1 mono text-[11px] bg-[#080c14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 hover:border-violet-500 disabled:opacity-40"><SkipBack size={13} /> Step back</button>
            <button onClick={() => { if (isLive) { onJump(0); setPlaying(true); } else setPlaying(!playing); }} className={cn("flex items-center gap-1 mono text-[11px] rounded-lg px-3 py-1.5 border font-semibold", playing ? "bg-red-500/15 text-red-300 border-red-500/40" : "bg-violet-600 text-white border-violet-500")}>
              {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? "Pause replay" : isLive ? "Replay from start" : "Resume replay"}
            </button>
            <button onClick={() => onJump(Math.min(history.length - 1, cursor + 1))} disabled={isLive} className="flex items-center gap-1 mono text-[11px] bg-[#080c14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 hover:border-violet-500 disabled:opacity-40">Step forward <SkipForward size={13} /></button>
            <button onClick={onJumpToLive} disabled={isLive} className="flex items-center gap-1 mono text-[11px] bg-emerald-600/90 text-white rounded-lg px-2.5 py-1.5 hover:bg-emerald-500 disabled:opacity-40"><RotateCcw size={13} /> Jump to live</button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="mono text-[10px] text-slate-500 shrink-0">#{cursor}</span>
          <input type="range" min={0} max={history.length - 1} value={cursor} onChange={(e) => onJump(Number(e.target.value))} className="flex-1" />
          <span className="mono text-[10px] text-slate-500 shrink-0">#{history.length - 1}</span>
          <span className="mono text-[11px] text-slate-300 bg-[#080c14] border border-slate-800 rounded-lg px-2.5 py-1 shrink-0">{history[cursor]?.type}</span>
        </div>
        <div className="mt-2 flex justify-between mono text-[10px] text-slate-600">
          <span>{history[0] ? new Date(history[0].timestamp).toLocaleTimeString() : ""}</span>
          <span>{history.length} actions recorded · scrub to inspect any snapshot</span>
          <span>{history[history.length - 1] ? new Date(history[history.length - 1].timestamp).toLocaleTimeString() : ""}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Timeline list */}
        <div ref={listRef} className="xl:col-span-3 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden slide-up" style={{ animationDelay: "60ms" }}>
          <div className="px-4 py-3 border-b border-slate-800 bg-[#0d1420] flex items-center gap-2">
            <Zap size={15} className="text-violet-400" /><h3 className="font-bold text-sm text-white">Action History</h3>
            <span className="mono text-[10px] text-slate-500 ml-auto">{history.length} entries · newest first</span>
          </div>
          <div className="max-h-[520px] overflow-auto divide-y divide-slate-800/60">
            {[...history].reverse().map((entry) => {
              const cat = categoryOf(entry.type);
              const isCursor = entry.index === cursor;
              const isFuture = entry.index > cursor;
              const isSel = entry.index === selected;
              return (
                <div key={entry.id} onClick={() => setSelected(entry.index)} className={cn("px-4 py-3 cursor-pointer transition-colors relative", isSel ? "bg-violet-500/[0.08]" : "hover:bg-white/[0.02]", isFuture && "opacity-45")}>
                  {isCursor && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-violet-500" />}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", cat.dot, isCursor && "ring-4 ring-violet-500/20")} />
                    <span className="mono text-[12.5px] font-bold text-slate-100 break-all">{entry.type}</span>
                    <span className={cn("mono text-[9px] uppercase tracking-wider border rounded-full px-1.5 py-px", cat.cls)}>{cat.label}</span>
                    {isCursor && <span className="mono text-[9px] bg-violet-600 text-white rounded-full px-1.5 py-px font-bold">◉ CURRENT</span>}
                    <span className="ml-auto flex items-center gap-3 shrink-0">
                      <span className="mono text-[10px] text-slate-500 flex items-center gap-1"><Timer size={10} /> {entry.durationMs}ms</span>
                      <span className="mono text-[10px] text-slate-500 flex items-center gap-1"><Clock size={10} /> {timeAgo(entry.timestamp)}</span>
                      <button onClick={(e) => { e.stopPropagation(); onJump(entry.index); }} className="flex items-center gap-1 mono text-[10px] bg-[#080c14] border border-slate-700 hover:border-violet-500 text-slate-300 rounded-lg px-2 py-1"><Crosshair size={11} /> Jump</button>
                    </span>
                  </div>
                  <div className="mono text-[10.5px] text-slate-500 mt-1.5 truncate pl-[18px]">{JSON.stringify(entry.payload)}</div>
                  <div className="mono text-[10px] text-slate-600 mt-0.5 pl-[18px]">#{entry.index} · {new Date(entry.timestamp).toLocaleString()} · {entry.source}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-2 space-y-4">
          {selEntry && (
            <>
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 slide-up" style={{ animationDelay: "120ms" }}>
                <div className="flex items-center gap-2 mb-3"><GitCompareArrows size={15} className="text-indigo-400" /><h3 className="font-bold text-sm text-white">Snapshot Diff</h3><span className="mono text-[10px] text-slate-500 ml-auto">#{selEntry.index} vs #{selEntry.index - 1}</span></div>
                <div className="mono text-[12px] font-bold text-violet-300 bg-[#080c14] border border-slate-800 rounded-lg px-3 py-2 break-all">{selEntry.type}</div>
                <div className="mt-3 space-y-1.5 max-h-56 overflow-auto">
                  {diffs.length === 0 && <div className="mono text-[11px] text-slate-500">No state changes detected for this action.</div>}
                  {diffs.map((d, i) => (
                    <div key={i} className="mono text-[10.5px] bg-[#080c14] border border-slate-800 rounded-lg px-2.5 py-2">
                      <div className="text-indigo-300 break-all">{d.path}</div>
                      <div className="flex flex-wrap gap-x-2 mt-1">
                        <span className="text-red-400/90 line-through decoration-red-400/40 break-all">{JSON.stringify(d.from)}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-emerald-300 break-all">{JSON.stringify(d.to)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 slide-up" style={{ animationDelay: "180ms" }}>
                <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">Payload & Snapshot</h3>
                  {expanded ? <ChevronUp size={15} className="ml-auto text-slate-400" /> : <ChevronDown size={15} className="ml-auto text-slate-400" />}
                </button>
                {expanded && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="mono text-[10px] text-slate-500 uppercase tracking-wider mb-1">payload</div>
                      <pre className="mono text-[11px] text-emerald-200 bg-[#080c14] border border-slate-800 rounded-lg px-3 py-2.5 max-h-40 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(selEntry.payload, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="mono text-[10px] text-slate-500 uppercase tracking-wider mb-1">state snapshot after action</div>
                      <pre className="mono text-[10.5px] text-slate-300 bg-[#080c14] border border-slate-800 rounded-lg px-3 py-2.5 max-h-56 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(selEntry.snapshot, null, 2)}</pre>
                    </div>
                    <button onClick={() => onJump(selEntry.index)} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl py-2.5 hover:brightness-110 active:scale-[0.99] transition-all">Jump to this snapshot</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
