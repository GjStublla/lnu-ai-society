"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, SendHorizontal, Sparkles, X } from "lucide-react";
import type { Quest } from "@/types/contracts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet } from "./sheet";

export type CoachMessage = {
  id: number;
  role: "user" | "coach";
  text: string;
  source?: "ai" | "offline";
  model?: string | null;
  disclaimer?: string | null;
  quest?: Quest | null;
};

const SUGGESTIONS = ["Why this time?", "Will this lower my bill?", "My electricity is in the rent — does it matter?"];

function Composer({ initial, pending, onSend }: { initial: string; pending: boolean; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.trim() || pending) return;
        onSend(draft);
        setDraft("");
      }}
    >
      <label htmlFor="coach-input" className="sr-only">
        Ask WattHabit a question
      </label>
      <input
        id="coach-input"
        data-autofocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={1200}
        placeholder="Ask about prices, bills or habits…"
        className="min-h-12 flex-1 rounded-full border border-input bg-background px-4 text-base placeholder:text-muted-foreground"
      />
      <Button type="submit" size="icon-lg" className="size-12 rounded-full" disabled={pending || !draft.trim()} aria-label="Send question">
        <SendHorizontal aria-hidden="true" />
      </Button>
    </form>
  );
}

export function CoachSheet({
  open,
  onClose,
  messages,
  pending,
  onAsk,
  prefill,
  prefillKey,
}: {
  open: boolean;
  onClose: () => void;
  messages: CoachMessage[];
  pending: boolean;
  onAsk: (text: string) => void;
  prefill: string;
  prefillKey: number;
}) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="coach-title">
      <div className="flex items-center gap-3 px-5 pt-3 pb-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="coach-title" className="text-lg leading-tight font-semibold">
            Ask WattHabit
          </h2>
          <p className="text-xs text-muted-foreground">Short answers about prices, bills and habits.</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Close Ask WattHabit">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <ol className="flex min-h-40 flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-3" aria-live="polite" aria-label="Conversation">
        {messages.length === 0 && (
          <li className="list-none rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Ask why a time is suggested, whether it changes your bill, or how much a habit saves. Answers are guidance, not measurements.
          </li>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "list-none text-[15px] leading-relaxed",
                m.role === "user" ? "max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "max-w-[94%] self-start rounded-2xl rounded-bl-md bg-muted px-4 py-3",
              )}
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "WattHabit: "}</span>
              {m.role === "coach" && (
                <span
                  className={cn(
                    "mb-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                    m.source === "ai" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground ring-1 ring-border",
                  )}
                >
                  {m.source === "ai" ? `AI-selected guidance${m.model ? ` · ${m.model}` : ""}` : "Offline guidance"}
                </span>
              )}
              <span className="block">{m.text}</span>
              {m.quest && (
                <span className="mt-2 block rounded-xl bg-card px-3 py-2 text-sm ring-1 ring-border">
                  <span className="block text-[11px] font-semibold text-primary">Suggested quest</span>
                  <span className="block font-medium">{m.quest.title}</span>
                  <span className="block text-xs text-muted-foreground">{m.quest.description}</span>
                  {m.quest.evidenceSource && (
                    <a href={m.quest.evidenceSource} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline">
                      Source <ArrowUpRight className="size-3" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  )}
                </span>
              )}
              {m.disclaimer && <span className="mt-1.5 block text-[11px] leading-snug text-muted-foreground">{m.disclaimer}</span>}
            </motion.li>
          ))}
          {pending && (
            <motion.li key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="list-none self-start rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              Thinking…
            </motion.li>
          )}
        </AnimatePresence>
      </ol>

      <div className="border-t border-border px-5 pt-3 pb-4">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3" role="group" aria-label="Suggested questions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAsk(s)}
              disabled={pending}
              className="min-h-10 shrink-0 rounded-full border border-input bg-background px-3.5 text-[13px] whitespace-nowrap transition-colors hover:border-primary/40 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <Composer key={prefillKey} initial={prefill} pending={pending} onSend={onAsk} />
      </div>
    </Sheet>
  );
}
