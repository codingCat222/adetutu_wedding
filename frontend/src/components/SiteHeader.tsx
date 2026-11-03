import { Link } from "react-router-dom";
import Monogram from "./Monogram";

export default function SiteHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 text-ivory">
          <Monogram className="w-9 h-9 text-current" />
          <span className="font-serif text-sm tracking-[0.2em]">ADETUTU &amp; VICTOR</span>
        </Link>
      </div>
    </header>
  );
}
