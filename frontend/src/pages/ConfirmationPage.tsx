import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Monogram from "../components/Monogram";

interface LocationState {
  attendanceStatus?: "ATTENDING" | "NOT_ATTENDING";
  fullName?: string;
}

export default function ConfirmationPage() {
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const isAttending = state.attendanceStatus !== "NOT_ATTENDING";

  return (
    <div className="min-h-screen bg-deep-plum text-ivory flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-md text-center"
      >
        <Monogram animate className="w-20 h-20 mx-auto mb-8 text-gold" />

        <p className="font-sans text-xs tracking-[0.3em] text-gold mb-4">
          {isAttending ? "RSVP CONFIRMED" : "RESPONSE RECEIVED"}
        </p>

        <h1 className="font-serif text-3xl sm:text-4xl mb-5 leading-snug">
          {isAttending ? "Thank You" : "We Understand"}
          {state.fullName ? `, ${state.fullName.split(" ")[0]}` : ""}
        </h1>

        <p className="font-sans text-ivory/75 leading-relaxed">
          {isAttending
            ? "Thank you for being part of our special celebration. We look forward to sharing this beautiful moment with you."
            : "Thank you for letting us know. You'll be in our hearts on the day, and we're grateful you took the time to respond."}
        </p>

        <Link
          to="/"
          className="mt-10 inline-flex items-center gap-3 border border-gold/60 text-gold font-sans text-sm px-8 py-4 rounded-sm hover:bg-gold hover:text-deep-plum transition-colors duration-300"
        >
          Return Home
        </Link>
      </motion.div>
    </div>
  );
}
