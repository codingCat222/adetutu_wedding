import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Plus, Ban } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { ConfirmDialog, Spinner, StatusBadge, btnGhost, btnPrimary, copyText, downloadBlob, fmtDate, inputCls, useToast } from "./ui";

interface Code { id: string; code: string; status: "UNUSED" | "USED" | "REVOKED"; createdAt: string; redeemedAt?: string | null; revokedAt?: string | null }
interface Page { items: Code[]; total: number; page: number; pageSize: number }
const PAGE_SIZE = 25;

export default function CodesPage() {
  const toast = useToast();
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [latest, setLatest] = useState<Code[]>([]);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [toRevoke, setToRevoke] = useState<Code | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), ...(filter ? { status: filter } : {}) });
      setData(await api<Page>(`/admin/invitation-codes?${qs}`));
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Could not load codes.");
    } finally {
      setLoading(false);
    }
  }, [page, filter, toast]);
  useEffect(() => { void load(); }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const r = await api<{ codes: Code[] }>("/admin/invitation-codes", { method: "POST", body: { count } });
      setLatest(r.codes);
      toast("success", `Generated ${r.codes.length} code${r.codes.length === 1 ? "" : "s"}.`);
      setPage(1);
      await load();
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Could not generate codes.");
    } finally {
      setGenerating(false);
    }
  }

  async function copy(text: string, msg: string) {
    const ok = await copyText(text);
    toast(ok ? "success" : "error", ok ? msg : "Could not copy. Please copy manually.");
  }

  async function revoke() {
    if (!toRevoke) return;
    setRevoking(true);
    try {
      await api(`/admin/invitation-codes/${toRevoke.id}/revoke`, { method: "PATCH" });
      toast("success", "Code revoked.");
      setToRevoke(null);
      await load();
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Could not revoke code.");
    } finally {
      setRevoking(false);
    }
  }

  const csv = (rows: Code[]) =>
    ["Code,Status,Created"].concat(rows.map((c) => `${c.code},${c.status},${c.createdAt}`)).join("\r\n");
  const exportAll = async () => {
    try {
      const all: Code[] = [];
      for (let p = 1; ; p++) {
        const r = await api<Page>(`/admin/invitation-codes?page=${p}&pageSize=200${filter ? `&status=${filter}` : ""}`);
        all.push(...r.items);
        if (all.length >= r.total || r.items.length === 0) break;
      }
      downloadBlob("invitation-codes.csv", csv(all), "text/csv");
    } catch {
      toast("error", "Could not export codes.");
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-deep-plum">Access Codes</h1>
        <p className="font-sans text-sm text-deep-plum/60 mt-1">Each code can be redeemed once.</p>
      </div>

      <section className="bg-white border border-plum/10 rounded-sm p-5">
        <h2 className="font-serif text-xl mb-4">Generate codes</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="count" className="block font-sans text-xs text-deep-plum/60 mb-1">How many (1–500)</label>
            <input id="count" type="number" min={1} max={500} value={count} onChange={(e) => setCount(Math.min(500, Math.max(1, Number(e.target.value) || 1)))} className={`${inputCls} w-32`} />
          </div>
          <button onClick={generate} disabled={generating} className={btnPrimary}><Plus size={16} />{generating ? "Generating…" : "Generate"}</button>
        </div>

        {latest.length > 0 && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <p className="font-sans text-sm font-medium">Just generated ({latest.length})</p>
              <button className={btnGhost} onClick={() => copy(latest.map((c) => c.code).join("\n"), "All codes copied.")}><Copy size={14} />Copy all</button>
              <button className={btnGhost} onClick={() => downloadBlob("new-codes.csv", csv(latest), "text/csv")}><Download size={14} />Download CSV</button>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto">
              {latest.map((c) => (
                <li key={c.id} className="flex items-center justify-between border border-plum/10 rounded-sm px-3 py-2 font-mono text-sm">
                  {c.code}
                  <button aria-label={`Copy ${c.code}`} onClick={() => copy(c.code, "Code copied.")} className="text-plum hover:text-deep-plum"><Copy size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="font-serif text-xl mr-auto">All codes</h2>
          <label className="sr-only" htmlFor="status">Filter by status</label>
          <select id="status" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All statuses</option>
            <option value="UNUSED">Unused</option>
            <option value="USED">Used</option>
            <option value="REVOKED">Revoked</option>
          </select>
          <button className={btnGhost} onClick={exportAll}><Download size={14} />Export CSV</button>
        </div>

        {loading && !data ? <Spinner /> : data && data.items.length === 0 ? (
          <p className="font-sans text-sm text-deep-plum/60 bg-white border border-plum/10 rounded-sm py-12 text-center">No codes yet. Generate some above.</p>
        ) : (
          <div className="overflow-x-auto bg-white border border-plum/10 rounded-sm">
            <table className="w-full font-sans text-sm">
              <thead className="text-left text-xs text-deep-plum/60 border-b border-plum/10">
                <tr><th className="p-3">Code</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {data?.items.map((c) => (
                  <tr key={c.id} className="border-b border-plum/5 last:border-0">
                    <td className="p-3 font-mono">{c.code}</td>
                    <td className="p-3"><StatusBadge value={c.status} /></td>
                    <td className="p-3 text-deep-plum/70">{fmtDate(c.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button className={btnGhost} onClick={() => copy(c.code, "Code copied.")} aria-label={`Copy ${c.code}`}><Copy size={14} /></button>
                        {c.status === "UNUSED" && <button className={btnGhost} onClick={() => setToRevoke(c)}><Ban size={14} />Revoke</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-3 font-sans text-sm">
            <span className="text-deep-plum/60">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button className={btnGhost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className={btnGhost} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!toRevoke}
        title="Revoke this code?"
        message={`${toRevoke?.code ?? ""} will stop working immediately. This cannot be undone.`}
        confirmLabel="Revoke"
        busy={revoking}
        onConfirm={revoke}
        onCancel={() => setToRevoke(null)}
      />
    </div>
  );
}
