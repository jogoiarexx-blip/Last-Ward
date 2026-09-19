import type { Flags } from "./types";

export type EndingId = "normal" | "good" | "secret" | "complete" | "bad";

export function resolveEnding(opts: {
  flags: Flags;
  secrets: number;
  collectibles: string[];
  routes: number;
}): EndingId {
  const civ =
    !!opts.flags.savedCourier && !!opts.flags.stoppedTruck && !!opts.flags.letEscape;
  const key = opts.collectibles.includes("ending-key");
  const yard = !!opts.flags["rain-wall"] || opts.collectibles.includes("token-gold");
  if (civ && key && opts.secrets >= 8 && opts.routes >= 8) return "complete";
  if (key || yard) return "secret";
  if (civ) return "good";
  if (!opts.flags.savedCourier && !opts.flags.stoppedTruck) return "bad";
  return "normal";
}
