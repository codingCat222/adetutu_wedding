import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { Spinner, StatusBadge, fmtDate } from "./ui";

interface Guest {
  id: string; fullName: string; phoneNumber: string; email: string | null; numberOfAttendees: number;
  attendanceStatus: string; capGeleInterest: string; dietaryRequirements: string | null; specialMessage: string | null;
  invitationCode: string; createdAt: string;
}

export default function GuestDetailPage() {
  const { id } = useParams();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ guest: Guest }>(`/admin/guests/${id}`)
      .then((r) => setGuest(r.guest))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load guest."));
  }, [id]);

  const rows: [string, React.ReactNode][] = guest
    ? [
        ["Full Name", guest.fullName],
        ["Phone Number", guest.phoneNumber],
        ["Email Address", guest.email ?? "—"],
        ["Number of Attendees", guest.numberOfAttendees],
        ["Attendance Status", <StatusBadge key="s" value={guest.attendanceStatus} />],
        ["Interested in Cap / Gele", { GELE: "Gele", CAP: "Cap", NONE: "Not interested" }[guest.capGeleInterest] ?? "—"],
        ["Dietary Requirements", guest.dietaryRequirements ?? "—"],
        ["Special Message", <span key="m" className="whitespace-pre-wrap">{guest.specialMessage ?? "—"}</span>],
        ["Invitation Code Used", <span key="c" className="font-mono">{guest.invitationCode}</span>],
        ["Submitted", fmtDate(guest.createdAt)],
      ]
    : [];

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/admin/guests" className="inline-flex items-center gap-2 font-sans text-sm text-plum hover:underline"><ArrowLeft size={16} />Back to guest list</Link>
      {error ? (
        <p role="alert" className="font-sans text-sm text-plum bg-white border border-plum/10 rounded-sm p-6">{error}</p>
      ) : !guest ? <Spinner /> : (
        <>
          <h1 className="font-serif text-3xl text-deep-plum">{guest.fullName}</h1>
          <dl className="bg-white border border-plum/10 rounded-sm divide-y divide-plum/10">
            {rows.map(([k, v]) => (
              <div key={k} className="grid sm:grid-cols-3 gap-1 sm:gap-4 p-4 font-sans text-sm">
                <dt className="text-deep-plum/60">{k}</dt>
                <dd className="sm:col-span-2">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}
