import "server-only";
import { z } from "zod";
import type { CoachRequest } from "../../types/contracts.ts";
import { TOPICS } from "./catalog.ts";

const timestamp = z.iso.datetime({ offset: true }).max(40);
const priceSummary = z.strictObject({
  cheapestWindowStart: timestamp.nullable(),
  cheapestWindowEnd: timestamp.nullable(),
  relativePriceDescription: z.string().trim().max(240).nullable(),
}).superRefine((value, context) => {
  const start = value.cheapestWindowStart;
  const end = value.cheapestWindowEnd;
  if ((start === null) !== (end === null) || (start && end && Date.parse(end) <= Date.parse(start))) {
    context.addIssue({ code: "custom", message: "Window timestamps must be paired and ordered." });
  }
});

export const coachRequestSchema = z.strictObject({
  region: z.enum(["SE1", "SE2", "SE3", "SE4"]),
  housing: z.enum(["included", "separate", "unknown"]),
  activities: z.array(z.enum(["laundry", "dishwasher", "charging"])).max(3)
    .refine((items) => new Set(items).size === items.length, "Activities must be unique."),
  availableAfter: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  priceSummary: priceSummary.nullable().default(null),
  message: z.string().trim().min(1).max(1200),
}) satisfies z.ZodType<CoachRequest>;

export const selectionSchema = z.strictObject({ topic: z.enum(TOPICS) });

export const selectionJsonSchema = {
  type: "object",
  properties: { topic: { type: "string", enum: [...TOPICS] } },
  required: ["topic"],
  additionalProperties: false,
};

export const completionSchema = z.object({
  model: z.string().min(1).max(120),
  choices: z.array(z.object({
    finish_reason: z.literal("stop"),
    message: z.object({ content: z.string().min(1).max(512) }),
  })).length(1),
});
