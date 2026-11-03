interface MonogramProps {
  className?: string;
  animate?: boolean;
}

/**
 * The site's recurring visual mark: an interlocking A·V initial inside a
 * hand-drawn botanical wreath. Used large in the hero, small in the nav,
 * and again on the confirmation page. One consistent motif rather than
 * stock floral clipart scattered around.
 */
export default function Monogram({ className = "", animate = false }: MonogramProps) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
        style={
          animate
            ? { strokeDasharray: 1600, strokeDashoffset: 1600, animation: "draw 2.6s ease-out forwards" }
            : undefined
        }
      >
        {/* Wreath - two asymmetric botanical branches */}
        <path d="M120 16 C 70 24, 32 60, 22 112 C 14 156, 34 196, 70 216" />
        <path d="M30 70 C 44 66, 56 70, 60 82" />
        <path d="M24 100 C 40 98, 52 104, 54 116" />
        <path d="M26 132 C 42 130, 54 136, 56 148" />
        <path d="M36 164 C 50 160, 62 164, 66 176" />
        <path d="M52 192 C 64 184, 76 184, 84 194" />

        <path d="M120 16 C 170 24, 208 60, 218 112 C 226 156, 206 196, 170 216" />
        <path d="M210 70 C 196 66, 184 70, 180 82" />
        <path d="M216 100 C 200 98, 188 104, 186 116" />
        <path d="M214 132 C 198 130, 186 136, 184 148" />
        <path d="M204 164 C 190 160, 178 164, 174 176" />
        <path d="M188 192 C 176 184, 164 184, 156 194" />
      </g>

      {/* Interlocking A V monogram */}
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M98 150 L113 98 L128 150" />
        <path d="M103 134 L123 134" />
        <path d="M112 98 L122 98 L142 150 L152 98 L162 98 L142 150 Z" opacity="0" />
        <path d="M128 98 L142 150 L156 98" />
      </g>

      {/* Year mark */}
      <text
        x="120"
        y="186"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="22"
        letterSpacing="2"
      >
        AV&apos;27
      </text>
    </svg>
  );
}
