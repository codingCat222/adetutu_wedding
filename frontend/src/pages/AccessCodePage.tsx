import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Monogram from "../components/Monogram";
import { api, ApiError } from "../lib/api";

type Status = "idle" | "verifying" | "error";

export default function AccessCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus("verifying");
    setErrorMessage("");

    try {
      await api("/invitations/verify", { method: "POST", body: { code } });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return;
    }
    navigate("/rsvp");
  }

  return (
    <div className="min-h-screen bg-deep-plum text-ivory flex flex-col">
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-3">
          <Monogram className="w-8 h-8 text-ivory/80" />
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 font-sans text-sm text-ivory/70 hover:text-ivory transition-colors">
          <ArrowLeft size={16} />
          Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <p className="font-sans text-xs tracking-[0.3em] text-gold text-center mb-4">
            PRIVATE INVITATION
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-center mb-3">
            Your Access Code
          </h1>
          <p className="font-sans text-sm text-ivory/70 text-center mb-10 leading-relaxed">
            Enter the code from your invitation to view your personal RSVP.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="access-code" className="sr-only">
              Invitation access code
            </label>
            <input
              id="access-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="e.g. AV'27-2K9X-4QBM"
              aria-invalid={status === "error"}
              aria-describedby={status === "error" ? "code-error" : undefined}
              className="w-full bg-transparent border border-ivory/30 rounded-sm px-5 py-4 text-center font-sans text-lg tracking-[0.15em] placeholder:text-ivory/30 focus:border-gold transition-colors"
            />

            {status === "error" && (
              <p id="code-error" role="alert" className="mt-3 text-sm text-center text-gold/90 font-sans">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "verifying"}
              className="mt-6 w-full bg-gold text-deep-plum font-sans font-medium text-sm px-8 py-4 rounded-sm hover:bg-ivory transition-colors duration-300 disabled:opacity-60"
            >
              {status === "verifying" ? "Verifying…" : "Verify Invitation"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
