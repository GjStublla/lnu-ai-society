"use client";

import { ArrowUpRight, BadgeCheck, FlaskConical } from "lucide-react";
import type { Opportunity } from "@/types/contracts";

export type RadarState = { kind: "loading" } | { kind: "ready"; items: Opportunity[]; fallback: boolean };

const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", year: "numeric" });
const fmt = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "unknown date" : dateFmt.format(t);
};

export function Radar({ state }: { state: RadarState }) {
  return (
    <div className="space-y-3">
      {state.kind === "loading" && <div className="h-36 animate-pulse rounded-[22px] border border-border bg-card" aria-hidden="true" />}

      {state.kind === "ready" && state.fallback && (
        <p className="text-xs text-muted-foreground" role="status">
          Opportunity feed unavailable. No offers are shown until a dated, sourced item is available.
        </p>
      )}

      {state.kind === "ready" && state.items.length === 0 && (
        <p className="rounded-[22px] border border-border bg-card p-4 text-sm text-muted-foreground">No current sourced items for your zone. We never invent offers.</p>
      )}

      {state.kind === "ready" &&
        state.items.map((o) => {
          const verified = o.verified && !o.demo;
          return (
            <article key={o.id} className="rounded-[22px] border border-border bg-card p-4" aria-labelledby={`opp-${o.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                {verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                    <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified source
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-input bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                    <FlaskConical className="size-3.5" aria-hidden="true" /> DEMO EXAMPLE · not verified
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground capitalize">{o.category}</span>
              </div>
              <h3 id={`opp-${o.id}`} className="mt-2 text-[15px] leading-snug font-semibold">
                {o.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{o.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Eligibility:</span> {o.eligibility}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Published {fmt(o.publishedAt)} · {o.expiresAt ? `expires ${fmt(o.expiresAt)}` : "no evidenced expiry"}
              </p>
              <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                View source <ArrowUpRight className="size-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </article>
          );
        })}

      <a
        className="group flex items-center justify-between gap-4 rounded-[22px] border border-border bg-accent/50 p-4"
        href="https://www.elprisetjustnu.se/elpris-api"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div>
          <p className="text-[11px] text-muted-foreground">Public reference · not a promotional offer</p>
          <h3 className="mt-1 text-[15px] font-semibold group-hover:underline">Get to know Swedish spot prices</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Elpriset just nu · API documentation · opens in a new tab</p>
        </div>
        <ArrowUpRight className="size-5 shrink-0 text-primary" aria-hidden="true" />
      </a>
    </div>
  );
}
