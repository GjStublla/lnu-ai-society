"use client";

import { useId } from "react";
import { motion, useMotionValue, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type MugProps = { progress: number; goal: number; className?: string };

const BODY = "M86 96 C86 77 254 77 254 96 L241 227 C235 277 106 277 99 227 Z";

/** A lightweight dimensional glass mug. Its liquid level represents participation. */
export function Mug({ progress, goal, className }: MugProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const fraction = goal > 0 ? Math.max(0, Math.min(1, progress / goal)) : 0;
  const level = 247 - fraction * 133;
  const transition = { duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.div
      className={cn("mug-object", className)}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        rotateY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 14);
        rotateX.set(((event.clientY - bounds.top) / bounds.height - 0.5) * -10);
      }}
      onPointerLeave={() => { rotateX.set(0); rotateY.set(0); }}
    >
      <svg
        viewBox="0 0 360 320"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Reward mug ${progress} of ${goal} full. Stamps count participation, not measured savings.`}
      >
        <defs>
          <linearGradient id={`${id}-glass`} x1="85" y1="150" x2="255" y2="172" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a9bca7" /><stop offset="0.17" stopColor="#edf2df" /><stop offset="0.4" stopColor="#f5f5e7" /><stop offset="0.74" stopColor="#cbd7bd" /><stop offset="1" stopColor="#819c80" />
          </linearGradient>
          <linearGradient id={`${id}-handle`} x1="247" y1="127" x2="299" y2="212" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e6edda" /><stop offset="0.4" stopColor="#9db496" /><stop offset="0.7" stopColor="#d0ddc2" /><stop offset="1" stopColor="#799675" />
          </linearGradient>
          <linearGradient id={`${id}-coffee`} x1="104" y1="150" x2="246" y2="245" gradientUnits="userSpaceOnUse">
            <stop stopColor="#b58b59" /><stop offset="0.45" stopColor="#926b42" /><stop offset="1" stopColor="#634a32" />
          </linearGradient>
          <linearGradient id={`${id}-shine`}>
            <stop stopColor="#f8f9ed" stopOpacity="0.05" /><stop offset="0.22" stopColor="#f8f9ed" stopOpacity="0.65" /><stop offset="0.5" stopColor="#f8f9ed" stopOpacity="0.13" /><stop offset="1" stopColor="#527954" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id={`${id}-shadow`}>
            <stop stopColor="#344b30" stopOpacity="0.26" /><stop offset="1" stopColor="#344b30" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-body`}><path d={BODY} /></clipPath>
        </defs>
        <ellipse cx="183" cy="282" rx="132" ry="20" fill={`url(#${id}-shadow)`} />
        <ellipse cx="171" cy="273" rx="88" ry="10" fill="#6a805e" opacity="0.1" />
        <path d="M247 118 C319 94 329 220 244 227 L247 201 C291 204 294 137 249 145 Z" fill={`url(#${id}-handle)`} stroke="#9caf94" strokeWidth="1.5" />
        <path d="M258 124 C309 117 316 208 256 216" fill="none" stroke="#f1f4e4" strokeOpacity="0.7" strokeWidth="3" />
        <path d={BODY} fill={`url(#${id}-glass)`} stroke="#9bae94" strokeWidth="1" />
        <g clipPath={`url(#${id}-body)`}>
          <motion.rect initial={false} x="85" width="170" height="170" animate={{ y: level }} transition={transition} fill={`url(#${id}-coffee)`} />
          {fraction > 0 && <motion.ellipse initial={false} cx="170" rx="81" ry="21" animate={{ cy: level }} transition={transition} fill="#c4a16c" />}
          {fraction > 0 && <motion.ellipse initial={false} cx="170" rx="74" ry="16" animate={{ cy: level + 1 }} transition={transition} fill="#91693e" />}
          <path d={BODY} fill={`url(#${id}-shine)`} />
          <path d="M103 115 L113 224 C114 237 122 243 126 244" fill="none" stroke="#fafbef" strokeOpacity="0.56" strokeWidth="9" strokeLinecap="round" />
          <path d="M236 121 L226 225" fill="none" stroke="#526f4c" strokeOpacity="0.16" strokeWidth="5" strokeLinecap="round" />
          {Array.from({ length: Math.max(0, goal - 1) }, (_, i) => (
            <path key={i} d={`M218 ${247 - ((i + 1) / goal) * 133} h11`} stroke="#edf2df" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
          ))}
        </g>
        <ellipse cx="170" cy="96" rx="84" ry="26" fill="#dce5cd" stroke="#a9b99e" strokeWidth="1.5" />
        <ellipse cx="170" cy="97" rx="75" ry="19" fill="#778f6d" />
        <ellipse cx="170" cy="101" rx="71" ry="14" fill={fraction >= 1 ? "#8d663e" : "#b1c2a2"} />
        <path d="M88 96 C88 127 249 131 253 97" fill="none" stroke="#f4f6e7" strokeWidth="4" strokeLinecap="round" />
        <path d="M106 244 C130 266 211 266 235 243" fill="none" stroke="#eff2dd" strokeOpacity="0.65" strokeWidth="3" strokeLinecap="round" />
        <g transform="translate(150 192)" fill="none" stroke="#f6f6e8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.82" aria-hidden="true">
          <path d="m23 -15 -13 18 h12 l-4 16 15-21 H21 Z" />
        </g>
        {fraction >= 1 && (
          <g fill="none" stroke="#7c9272" strokeWidth="2.5" strokeLinecap="round" opacity="0.6">
            <path d="M147 60 c-14 -14 12 -19 0 -34" /><path d="M173 53 c-14 -14 12 -19 0 -34" /><path d="M198 59 c-14 -14 12 -19 0 -34" />
          </g>
        )}
      </svg>
    </motion.div>
  );
}
