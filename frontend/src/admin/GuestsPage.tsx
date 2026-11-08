import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Search } from "lucide-react";
import { api, apiUrl, authHeaders, ApiError } from "../lib/api";
import { Spinner, StatusBadge, btnGhost, downloadBlob, fmtDate, inputCls, useToast } from "./ui";

interface Guest { id: string; fullName: string; phoneNumber: string; email: string | null; numberOfAttendees: number; attendanceStatus: string; capGeleInterest: string; paymentProofName?: string | null; paymentSenderName?: string | null; createdAt: string }
interface Resp {
  items: Guest[]; total: number; page: number; pageSize: number;
  summary: { totalInvitationsGenerated: number; totalConfirmedGuests: number; totalDeclined: number; totalExpectedAttendees: number; unusedInvitationCodes: number; capInterest: number; geleInterest: number };
}
const PAGE_SIZE = 10;

export default function GuestsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useCallback(
    (extra: Record<string, string> = {}) =>
      new URLSearchParams({ sort, ...(debounced ? { search: debounced } : {}), ...(status ? { status } : {}), ...extra }),
    [sort, debounced, status],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<Resp>(`/admin/guests?${query({ page: String(page), pageSize: String(PAGE_SIZE) })}`)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && toast("error", e instanceof ApiError ? e.message : "Could not load guests."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [query, page, toast]);

  async function exportCsv() {
    try {
      const res = await fetch(apiUrl(`/admin/guests/export?${query()}`), {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      downloadBlob("guests.csv", await res.blob(), "text/csv");
    } catch {
      toast("error", "Could not export guests.");
    }
  }

  const s = data?.summary;
  const cards = [
    ["Invitations generated", s?.totalInvitationsGenerated],
    ["Confirmed guests", s?.totalConfirmedGuests],
    ["Declined", s?.totalDeclined],
    ["Expected attendees", s?.totalExpectedAttendees],
    ["Unused codes", s?.unusedInvitationCodes],
    ["Interested in gele", s?.geleInterest],
    ["Interested in cap", s?.capInterest],
  ] as const;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-deep-plum">Guest List</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white border border-plum/10 rounded-sm p-4">
            <p className="font-sans text-xs text-deep-plum/60">{label}</p>
            <p className="font-serif text-3xl text-plum mt-1">{value ?? "–"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-deep-plum/40" />
          <label htmlFor="search" className="sr-only">Search guests by name</label>
          <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className={`${inputCls} w-full pl-9`} />
        </div>
        <label className="sr-only" htmlFor="rsvp">Filter by RSVP status</label>
        <select id="rsvp" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All responses</option>
          <option value="ATTENDING">Attending</option>
          <option value="NOT_ATTENDING">Declined</option>
        </select>
        <label className="sr-only" htmlFor="sort">Sort by submission date</label>
        <select id="sort" value={sort} onChange={(e) => { setSort(e.target.value as "asc" | "desc"); setPage(1); }} className={inputCls}>
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <button className={btnGhost} onClick={exportCsv}><Download size={14} />Export CSV</button>
      </div>

      {loading && !data ? <Spinner /> : data && data.items.length === 0 ? (
        <p className="font-sans text-sm text-deep-plum/60 bg-white border border-plum/10 rounded-sm py-12 text-center">
          {debounced || status ? "No guests match your filters." : "No RSVPs yet."}
        </p>
      ) : (
        <div className={`overflow-x-auto bg-white border border-plum/10 rounded-sm ${loading ? "opacity-60" : ""}`}>
          <table className="w-full font-sans text-sm">
            <thead className="text-left text-xs text-deep-plum/60 border-b border-plum/10">
              <tr>
                <th className="p-3">Guest Name</th><th className="p-3">Phone</th><th className="p-3">Email</th>
                <th className="p-3">Attendees</th><th className="p-3">RSVP</th><th className="p-3">Cap / Gele</th><th className="p-3">Submitted</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((g) => (
                <tr key={g.id} className="border-b border-plum/5 last:border-0">
                  <td className="p-3 font-medium"><Link to={`/admin/guests/${g.id}`} className="hover:text-plum">{g.fullName}</Link></td>
                  <td className="p-3">{g.phoneNumber}</td>
                  <td className="p-3 text-deep-plum/70">{g.email ?? "—"}</td>
                  <td className="p-3">{g.numberOfAttendees}</td>
                  <td className="p-3"><StatusBadge value={g.attendanceStatus} /></td>
                  <td className="p-3 text-deep-plum/70">
                    <div>
                      <span>{{ GELE: "Gele (₦10k)", CAP: "Cap (₦7k)", NONE: "—" }[g.capGeleInterest] ?? "—"}</span>
                      {g.paymentProofName && (
                        <Link
                          to={`/admin/guests/${g.id}`}
                          className="ml-2 inline-block rounded-full bg-olive/15 text-deep-olive px-2 py-0.5 text-xs font-medium hover:bg-olive/25"
                        >
                          Receipt ✓
                        </Link>
                      )}
                    </div>
                    {g.paymentSenderName && (
                      <div className="text-xs text-deep-plum/50 truncate max-w-[180px]" title={`Paid by: ${g.paymentSenderName}`}>
                        Paid by: {g.paymentSenderName}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-deep-plum/70 whitespace-nowrap">{fmtDate(g.createdAt)}</td>
                  <td className="p-3 text-right"><Link to={`/admin/guests/${g.id}`} className="text-plum hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between font-sans text-sm">
          <span className="text-deep-plum/60">Page {page} of {pages} · {data.total} guests</span>
          <div className="flex gap-2">
            <button className={btnGhost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button className={btnGhost} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
