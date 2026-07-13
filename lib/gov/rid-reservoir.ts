/**
 * Royal Irrigation Department (RID) public reservoir API
 * (app.rid.go.th/reservoir) — daily storage, inflow, and outflow for the
 * ~460 reservoirs RID operates, grouped by region. No API key required.
 *
 * All volumes are in million cubic meters (MCM). Names and regions are
 * Thai-only upstream; regions get an English label from a small local map.
 */

import { SITE_CONFIG } from "@/lib/config"

/** RID storage classification: >100% of capacity = over capacity (danger),
 * 81–100% = high water (น้ำมาก). Below that isn't a flood concern. */
export const RESERVOIR_HIGH_PERCENT = 81
export const RESERVOIR_OVER_PERCENT = 100

export interface GovReservoir {
  id: string
  /** Thai-only upstream (e.g. "เขื่อนภูมิพล", "อ่างเก็บน้ำห้วยแม่ออน"). */
  name: string
  region: { th: string; en: string }
  /** Total capacity, MCM. */
  capacity: number
  /** Current stored volume, MCM. */
  volume: number
  /** volume / capacity — can exceed 100 when over capacity. */
  percentStorage: number
  /** Daily in/out, MCM — null when the reservoir doesn't report them. */
  inflow: number | null
  outflow: number | null
}

export interface GovReservoirSituation {
  /** Upstream data date, "YYYY-MM-DD". */
  date: string
  totalReservoirs: number
  overCapacityCount: number
  highCount: number
  /** Fullest reservoirs, worst first. */
  top: GovReservoir[]
}

interface RawReservoir {
  id: string
  name: string
  storage: number | null
  volume: number | null
  percent_storage: number | null
  inflow: number | null
  outflow: number | null
}

interface RawRegionGroup {
  region: string
  reservoir?: RawReservoir[]
}

const RID_RESERVOIR_URL = "https://app.rid.go.th/reservoir/api/reservoir/public"

const REGION_EN: Record<string, string> = {
  ภาคเหนือ: "North",
  ภาคตะวันออกเฉียงเหนือ: "Northeast",
  ภาคกลาง: "Central",
  ภาคตะวันออก: "East",
  ภาคตะวันตก: "West",
  ภาคใต้: "South",
}

/** app.rid.go.th intermittently fails to accept connections at all (undici
 * gives up after its 10 s connect timeout), then works on the next try —
 * so retry connect-level failures instead of failing the section. */
const RID_FETCH_ATTEMPTS = 3

async function fetchRidFeed(): Promise<{ date?: string; data?: RawRegionGroup[] }> {
  let lastError: unknown
  for (let attempt = 0; attempt < RID_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(RID_RESERVOIR_URL, {
        next: { revalidate: SITE_CONFIG.fetch.govRevalidateSeconds },
      })
      if (!response.ok) throw new Error(`RID reservoir API error: ${response.status}`)
      return (await response.json()) as { date?: string; data?: RawRegionGroup[] }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

function flattenReservoirs(json: { data?: RawRegionGroup[] }): GovReservoir[] {
  return (json.data ?? []).flatMap((group) =>
    (group.reservoir ?? [])
      .filter((r) => typeof r.percent_storage === "number" && typeof r.storage === "number")
      .map((r) => ({
        id: r.id,
        name: r.name,
        region: { th: group.region, en: REGION_EN[group.region] ?? group.region },
        capacity: r.storage as number,
        volume: r.volume ?? 0,
        percentStorage: r.percent_storage as number,
        inflow: r.inflow,
        outflow: r.outflow,
      })),
  )
}

/** Last successful parse, served when every retry fails — reservoir data is
 * daily, so a stale copy beats an empty section. (Per-instance memory: lost
 * on restart/cold start, which just falls back to the error state.) */
let lastGood: GovReservoirSituation | null = null

export async function fetchReservoirSituation(): Promise<GovReservoirSituation> {
  let json: { date?: string; data?: RawRegionGroup[] }
  try {
    json = await fetchRidFeed()
  } catch (err) {
    if (lastGood) return lastGood
    throw err
  }

  const reservoirs = flattenReservoirs(json)

  const situation: GovReservoirSituation = {
    date: json.date ?? "",
    totalReservoirs: reservoirs.length,
    overCapacityCount: reservoirs.filter((r) => r.percentStorage > RESERVOIR_OVER_PERCENT).length,
    highCount: reservoirs.filter(
      (r) => r.percentStorage >= RESERVOIR_HIGH_PERCENT && r.percentStorage <= RESERVOIR_OVER_PERCENT,
    ).length,
    top: [...reservoirs]
      .sort((a, b) => b.percentStorage - a.percentStorage)
      .slice(0, SITE_CONFIG.fetch.govReservoirTop),
  }
  lastGood = situation
  return situation
}

/** All ~460 reservoirs matched by name or region, fullest first — backs the
 * chat `/reservoir <name>` search (the shared payload only carries the top
 * few, so search has to happen here against the full cached feed). */
export async function searchReservoirs(query: string): Promise<GovReservoir[]> {
  const q = query.toLowerCase()
  const json = await fetchRidFeed()
  return flattenReservoirs(json)
    .filter((r) => [r.name, r.region.th, r.region.en].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => b.percentStorage - a.percentStorage)
    .slice(0, 10)
}
