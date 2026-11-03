import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Monogram from "../components/Monogram";
import SiteHeader from "../components/SiteHeader";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ivory">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-deep-plum text-ivory">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 pt-32 pb-24 sm:pt-40 sm:pb-32 grid md:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <p className="font-sans text-sm text-gold/90 mb-6">
              Sanwoolu&rsquo;s &amp; Godonu&rsquo;s Families request the honour of your presence
            </p>
            <h1 className="font-serif font-light leading-[0.95] text-5xl sm:text-6xl lg:text-7xl">
              <span className="block">Adetutu</span>
              <span className="block font-script text-4xl sm:text-5xl text-gold my-2 ml-2">
                &amp;
              </span>
              <span className="block">Victor</span>
            </h1>
            <p className="font-sans text-base sm:text-lg text-ivory/80 mt-8 max-w-md leading-relaxed">
              Together with our families, we joyfully invite you to celebrate our union.
            </p>

            <button
              onClick={() => navigate("/invitation")}
              className="mt-10 inline-flex items-center gap-3 bg-gold text-deep-plum font-sans font-medium text-sm px-8 py-4 rounded-sm hover:bg-ivory transition-colors duration-300"
            >
              Access Your Invitation
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="justify-self-center"
          >
            <Monogram animate className="w-56 h-56 sm:w-72 sm:h-72 text-gold/80" />
          </motion.div>
        </div>

        {/* soft texture divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </section>

      {/* DRESS CODE */}
      <section className="bg-plum text-ivory">
        <div className="mx-auto max-w-3xl px-6 sm:px-10 py-20 text-center">
          <p className="font-sans text-xs tracking-[0.3em] text-gold mb-4">DRESS CODE</p>
          <h2 className="font-serif text-4xl sm:text-5xl mb-5">All White</h2>
          <p className="font-sans text-ivory/75 max-w-md mx-auto leading-relaxed">
            Kindly grace the occasion in your finest white attire.
          </p>
        </div>
      </section>

      {/* DETAILS STRIP */}
      <section className="bg-ivory">
        <div className="mx-auto max-w-4xl px-6 sm:px-10 py-20 text-center">
          <Monogram className="w-12 h-12 mx-auto mb-8 text-olive" />
          <p className="font-serif text-2xl sm:text-3xl text-deep-plum leading-snug max-w-xl mx-auto">
            Every seat at our table has a story &mdash; we hope yours is part of ours.
          </p>
          <button
            onClick={() => navigate("/invitation")}
            className="mt-10 inline-flex items-center gap-3 border border-olive text-olive font-sans text-sm px-8 py-4 rounded-sm hover:bg-olive hover:text-ivory transition-colors duration-300"
          >
            Enter Access Code
          </button>
        </div>
      </section>

      <footer className="bg-deep-plum text-ivory/50 text-center py-8 font-sans text-xs">
        With love, the Sanwoolu &amp; Godonu families
      </footer>
    </div>
  );
}
