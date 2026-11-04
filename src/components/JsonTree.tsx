import { useState } from "react";
import { ChevronRight, ChevronDown, Copy, Check, Pencil, Braces, Brackets, CircleDot } from "lucide-react";
import { cn } from "../utils/cn";
import { validateValue } from "../store/data";

interface Props {
  label: string;
  value: any;
  path: string[];
  depth?: number;
  selectedPath: string[];
  onSelect: (path: string[]) => void;
  onPatch: (path: string[], value: any) => void;
  search: string;
  defaultOpen?: boolean;
}

function typeOf(v: any): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function matchesSearch(label: string, value: any, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  if (label.toLowerCase().includes(q)) return true;
  if (typeof value === "string" && value.toLowerCase().includes(q)) return true;
  if (typeof value === "number" && String(value).includes(q)) return true;
  if (value && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => matchesSearch(k, v, search));
  }
  return false;
}

export default function JsonTree({ label, value, path, depth = 0, selectedPath, onSelect, onPatch, search, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shake, setShake] = useState(false);

  const t = typeOf(value);
  const isContainer = t === "object" || t === "array";
  const isSelected = JSON.stringify(selectedPath) === JSON.stringify(path);
  const visible = matchesSearch(label, value, search);
  if (!visible && search) return null;

  const childEntries: [string, any][] = isContainer ? Object.entries(value) : [];
  const count = childEntries.length;

  const startEdit = () => {
    if (isContainer) return;
    setDraft(t === "boolean" ? String(value) : String(value ?? ""));
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    let parsed: any = draft;
    if (t === "number") {
      parsed = Number(draft);
      if (Number.isNaN(parsed)) { setError("Not a valid number"); setShake(true); setTimeout(() => setShake(false), 600); return; }
    } else if (t === "boolean") {
      if (!["true", "false"].includes(draft.toLowerCase())) { setError("Use true or false"); setShake(true); setTimeout(() => setShake(false), 600); return; }
      parsed = draft.toLowerCase() === "true";
    } else if (t === "string") {
      // allow JSON-ish? keep string
      parsed = draft;
    }
    const err = validateValue(path, parsed, value);
    if (err) { setError(err); setShake(true); setTimeout(() => setShake(false), 600); return; }
    onPatch(path, parsed);
    setEditing(false);
    setError(null);
  };

  const copyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(path.join(".")).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  };

  const valueColor = (v: any) => {
    if (typeof v === "string") return "text-emerald-300";
    if (typeof v === "number") return "text-amber-300";
    if (typeof v === "boolean") return "text-violet-300";
    if (v === null) return "text-slate-500";
    return "text-slate-300";
  };

  const renderPrimitive = () => {
    if (editing) {
      return (
        <span className={cn("inline-flex items-center gap-1.5", shake && "shake")} onClick={(e) => e.stopPropagation()}>
          {t === "boolean" ? (
            <select autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} className="mono text-[11px] bg-[#0f172a] border border-violet-500 rounded px-1.5 py-0.5 text-violet-200 outline-none">
              <option value="true">true</option><option value="false">false</option>
            </select>
          ) : (
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} onBlur={commit} className={cn("mono text-[11px] bg-[#0f172a] border rounded px-1.5 py-0.5 outline-none w-40", error ? "border-red-500 text-red-300" : "border-violet-500 text-white")} />
          )}
          <button onClick={commit} className="text-[10px] mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded px-1.5 py-0.5">✓ save</button>
          <button onClick={() => setEditing(false)} className="text-[10px] mono text-slate-400 border border-slate-700 rounded px-1.5 py-0.5">esc</button>
          {error && <span className="text-[10px] mono text-red-400">{error}</span>}
        </span>
      );
    }
    return (
      <span className={cn("mono text-[12px] break-all", valueColor(value))}>
        {typeof value === "string" ? `"${value}"` : String(value)}
      </span>
    );
  };

  return (
    <div>
      <div
        onClick={() => { onSelect(path); if (isContainer) setOpen(!open); }}
        onDoubleClick={startEdit}
        className={cn(
          "group flex items-center gap-1.5 px-2 py-[5px] rounded-md cursor-pointer border border-transparent transition-colors",
          isSelected ? "bg-violet-500/15 border-violet-500/30" : "hover:bg-white/[0.04]",
          depth === 0 && "mt-0.5"
        )}
        style={{ paddingLeft: `${8 + depth * 18}px` }}
        title={isContainer ? "Click to expand / collapse" : "Double-click to edit"}
      >
        {isContainer ? (
          <span className="shrink-0 text-slate-500">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        ) : (
          <span className="shrink-0 w-[14px] flex justify-center"><CircleDot size={6} className="text-slate-600" /></span>
        )}

        <span className={cn("mono text-[12.5px] font-semibold shrink-0", depth === 0 ? "text-indigo-300 text-[13px]" : "text-slate-200")}>{label}</span>
        <span className="text-slate-600 mono text-[11px]">:</span>

        {isContainer ? (
          <span className="inline-flex items-center gap-1.5">
            {t === "array" ? <Brackets size={13} className="text-indigo-400" /> : <Braces size={13} className="text-indigo-400" />}
            <span className="mono text-[11px] text-slate-400">{t === "array" ? `[ ${count} ]` : `{ ${count} keys }`}</span>
          </span>
        ) : renderPrimitive()}

        <span className="ml-auto hidden group-hover:inline-flex items-center gap-1 shrink-0">
          {!isContainer && <button onClick={(e) => { e.stopPropagation(); startEdit(); }} className="p-1 rounded text-slate-400 hover:text-violet-300 hover:bg-violet-500/10" title="Edit value"><Pencil size={12} /></button>}
          <button onClick={copyPath} className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10" title="Copy path">
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </span>
        {isSelected && !isContainer && <span className="ml-1 text-[9px] mono text-violet-400 border border-violet-500/40 bg-violet-500/10 rounded px-1 py-px shrink-0 hidden sm:inline">dbl-click edit</span>}
      </div>

      {isContainer && open && (
        <div className="relative">
          <div className="absolute left-[13px] top-0 bottom-2 w-px bg-slate-800" style={{ left: `${13 + depth * 18}px` }} />
          {childEntries.map(([k, v]) => (
            <JsonTree key={k} label={k} value={v} path={[...path, k]} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} onPatch={onPatch} search={search} defaultOpen={depth < 1} />
          ))}
          {count === 0 && <div className="mono text-[11px] text-slate-600 py-1" style={{ paddingLeft: `${28 + depth * 18}px` }}>empty</div>}
        </div>
      )}
    </div>
  );
}
