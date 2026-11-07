"use client";
/**
 * Reward-progress mug. Stable public interface: `MugProps` ({ progress, goal }).
 *
 * 3D swap-in (only if three / @react-three/fiber are approved by Gjin and added
 * to package.json): create `mug-3d.tsx` with the same `MugProps`, then in the
 * callers use
 *   const Mug3D = dynamic(() => import("./mug-3d"), { ssr: false, loading: () => <Mug {...props} /> });
 * and render the SVG `Mug` when `useReducedMotion()` is true or WebGL is missing.
 * Coffee brown is intentionally used ONLY inside the cup.
 */
import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type MugProps = { progress: number; goal: number; className?: string };

const BODY = "M42 46 H150 L145 158 C144 175 132 186 115 186 H77 C60 186 48 175 47 158 Z";
const WAVE = "M-200 0 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V160 H-200 Z";
const CREMA = "M-200 0 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0";
const TOP = 50;
const BOTTOM = 190;
const INK = "#123a35";

export function Mug({ progress, goal, className }: MugProps) {
  const reduce = useReducedMotion();
  const clipId = useId();
  const fraction = goal > 0 ? Math.max(0, Math.min(1, progress / goal)) : 0;
  const full = fraction >= 1;
  const level = BOTTOM - (BOTTOM - TOP - 6) * fraction;

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={`Reward mug ${progress} of ${goal} full. Stamps count participation, not measured savings.`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={BODY} />
        </clipPath>
      </defs>

      <ellipse cx="96" cy="192" rx="62" ry="5" fill="rgb(18 58 53 / 0.1)" />
      <path d="M148 72 h7 c26 0 26 54 -4 54 h-9" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d={BODY} fill="#ffffff" />

      <g clipPath={`url(#${clipId})`}>
        <motion.g initial={false} animate={{ y: level }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 14 }}>
          <motion.g animate={reduce ? { x: 0 } : { x: [0, -100] }} transition={reduce ? { duration: 0 } : { duration: 4.5, ease: "linear", repeat: Infinity }}>
            <path d={WAVE} transform="translate(0 4)" fill="#8a6446" opacity="0.5" />
          </motion.g>
          <motion.g animate={reduce ? { x: 0 } : { x: [-50, 50] }} transition={reduce ? { duration: 0 } : { duration: 6, ease: "linear", repeat: Infinity }}>
            <path d={WAVE} fill="#6b4a33" />
            <path d={CREMA} fill="none" stroke="#d8b58c" strokeWidth="3.5" strokeLinecap="round" />
          </motion.g>
        </motion.g>
      </g>

      <path d={BODY} fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M38 46 H154" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      {Array.from({ length: Math.max(0, goal - 1) }, (_, i) => {
        const y = BOTTOM - ((i + 1) * (BOTTOM - TOP)) / goal;
        return <line key={i} x1="50" x2="57" y1={y} y2={y} stroke={INK} strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />;
      })}

      <AnimatePresence>
        {full && (
          <motion.g key="steam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[78, 96, 114].map((x, i) => (
              <motion.path
                key={x}
                d={`M${x} 36 c-8 -8 8 -13 0 -22`}
                fill="none"
                stroke="#9db3ad"
                strokeWidth="3"
                strokeLinecap="round"
                animate={reduce ? { opacity: 0.7 } : { opacity: [0.15, 0.8, 0.15], y: [2, -4, 2] }}
                transition={reduce ? { duration: 0 } : { duration: 2.6, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
              />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {full && (
          <motion.g
            key="check"
            initial={{ scale: reduce ? 1 : 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 16, delay: 0.4 }}
            style={{ transformOrigin: "96px 120px" }}
          >
            <circle cx="96" cy="120" r="20" fill="#0b5d55" stroke="#fff" strokeWidth="3" />
            <path d="m87 120 6 6 12-13" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}
