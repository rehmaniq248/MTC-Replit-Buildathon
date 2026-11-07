import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface Launch {
  href: string;
  color: string;
  rect: { top: number; left: number; width: number; height: number };
  symbol?: ReactNode;
}

const Ctx = createContext<(l: Launch) => void>(() => {});
export const useWhoosh = () => useContext(Ctx);

/**
 * Click a block -> its colour panel expands from the block's exact rect to fill the screen,
 * the route changes underneath, then the panel fades away to reveal the page.
 */
export function WhooshProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<(Launch & { phase: "expand" | "reveal" }) | null>(null);

  const launch = useCallback(
    (l: Launch) => {
      if (reduce) {
        window.location.hash = l.href.replace(/^#/, "");
        return;
      }
      setActive({ ...l, phase: "expand" });
    },
    [reduce],
  );

  return (
    <Ctx.Provider value={launch}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            key="whoosh"
            aria-hidden
            className="pointer-events-none fixed z-[100] overflow-hidden"
            style={{ background: active.color }}
            initial={{ ...active.rect, borderRadius: 0 }}
            animate={
              active.phase === "expand"
                ? { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, opacity: 1 }
                : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, opacity: 0 }
            }
            exit={{ opacity: 0 }}
            transition={active.phase === "expand" ? { duration: 0.55, ease: [0.76, 0, 0.24, 1] } : { duration: 0.35, ease: "easeOut" }}
            onAnimationComplete={() => {
              if (active.phase === "expand") {
                window.location.hash = active.href.replace(/^#/, "");
                setActive({ ...active, phase: "reveal" });
              } else setActive(null);
            }}
          >
            {active.symbol && (
              <motion.div
                className="absolute inset-0 grid place-items-center text-snow/25"
                initial={{ scale: 0.6 }}
                animate={{ scale: 1.6 }}
                transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
              >
                <div className="h-[40vmin] w-[40vmin]">{active.symbol}</div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
