import { useState, useCallback } from "react";
import { motion, useAnimation, Variants } from "framer-motion";

interface Props {
  onClick?: () => void;
}

const vanVariants: Variants = {
  start: { x: "-120%", opacity: 0 },
  driveFront: {
    x: "-10%",
    opacity: 1,
    transition: { duration: 0.9, ease: "easeInOut" },
  },
  enterGarage: {
    x: "10%",
    transition: { duration: 0.7, ease: "easeInOut" },
  },
  hide: {
    x: "25%",
    opacity: 0,
    transition: { duration: 0.4, ease: "easeInOut" },
  },
};

const doorVariants: Variants = {
  closed: { y: 0 },
  open: {
    y: "-92%",
    transition: { duration: 0.7, ease: "easeInOut" },
  },
  closedBack: {
    y: 0,
    transition: { duration: 0.7, ease: "easeInOut" },
  },
};

export const AccessSpaceCta = ({ onClick }: Props) => {
  const van = useAnimation();
  const door = useAnimation();
  const [busy, setBusy] = useState(false);

  const sequence = useCallback(async () => {
    if (busy) return;
    setBusy(true);

    await van.start("driveFront");
    await door.start("open");
    await van.start("enterGarage");
    await van.start("hide");
    await door.start("closedBack");

    setBusy(false);
  }, [busy, van, door]);

  return (
    <div className="flex flex-col items-center gap-6 select-none">

      {/* SCÈNE CAMION */}
      <div
        className="relative w-full max-w-xl p-4 bg-gradient-to-br from-sky-50 to-slate-100 rounded-3xl border border-sky-100 shadow-xl"
        onMouseEnter={sequence}
      >
        {/* GARAGE */}
        <div className="relative mx-auto h-40 w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">

          {/* FRONTON + LOGO */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-2 flex items-center gap-2 text-white font-semibold">
            <img src="/logo-apogee.png" alt="" className="h-6 w-auto" />
            <span className="text-sm">HELP Confort Services</span>
          </div>

          {/* OUVERTURE GARAGE */}
          <div className="relative h-28 w-full mt-4 overflow-hidden rounded-md bg-slate-800">
            {/* RIDEAU */}
            <motion.div
              className="absolute inset-0 bg-[repeating-linear-gradient(180deg,#111827,#111827_4px,#020617_4px,#020617_8px)]"
              variants={doorVariants}
              initial="closed"
              animate={door}
            />
          </div>
        </div>

        {/* CAMION SVG */}
        <motion.img
          src="/hc-van.svg"
          alt="Camion Help Confort"
          className="absolute -bottom-3 left-1/2 h-20 -translate-x-1/2"
          variants={vanVariants}
          initial="start"
          animate={van}
        />
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => {
          sequence();
          if (onClick) onClick();
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-full shadow-lg shadow-orange-500/40 hover:bg-orange-600"
      >
        Accéder à mon espace
      </motion.button>

    </div>
  );
};
