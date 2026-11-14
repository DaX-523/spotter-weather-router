// The driver may enter the load in pounds or kilograms; the API always gets pounds. This is the
// one place the UI converts units, at the input's edge.

export type LoadUnit = "lb" | "kg";

export const LOAD_UNITS: readonly LoadUnit[] = ["lb", "kg"];
const KG_PER_LB = 0.45359237;
/** The US federal gross weight limit (owner's decision), as the backend enforces it. */
export const MAX_LOAD_LB = 80_000;

/** Whole pounds from kilograms: a fraction of a pound changes nothing a route depends on. */
export function toPounds(amount: number, unit: LoadUnit): number {
  return unit === "lb" ? amount : Math.round(amount / KG_PER_LB);
}

export function fromPounds(pounds: number, unit: LoadUnit): number {
  return unit === "lb" ? pounds : Math.round(pounds * KG_PER_LB);
}

/** Rounded down in kilograms, so the most a driver can enter stays within the limit. */
export function maxLoad(unit: LoadUnit): number {
  return unit === "lb" ? MAX_LOAD_LB : Math.floor(MAX_LOAD_LB * KG_PER_LB);
}
