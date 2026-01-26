/**
 * OperiaLogo - Logo OPERIA avec animation hover premium
 */

interface OperiaLogoProps {
  size?: number;
}

export function OperiaLogo({ size = 36 }: OperiaLogoProps) {
  return (
    <a
      href="/"
      aria-label="OPERIA"
      className="operia-logo"
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="/assets/operia-logo.png"
        alt="OPERIA"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        draggable={false}
      />
      <style>{`
        .operia-logo {
          cursor: pointer;
          transform: translateZ(0);
          transition: transform 280ms ease, filter 280ms ease;
          filter: drop-shadow(0 0 0 rgba(0,0,0,0));
        }

        .operia-logo:hover {
          transform: scale(1.06);
          filter: drop-shadow(0 0 18px rgba(0, 180, 255, 0.55));
        }

        .operia-logo:active {
          transform: scale(1.02);
        }

        .operia-logo:hover img {
          animation: operiaPulse 900ms ease-in-out 1;
        }

        @keyframes operiaPulse {
          0%   { transform: scale(1); }
          45%  { transform: scale(1.02); }
          100% { transform: scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .operia-logo, .operia-logo:hover, .operia-logo:hover img {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </a>
  );
}
