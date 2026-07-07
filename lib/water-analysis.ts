import type { TimeToThreshold, WarningSeverity, WaterReading, WaterTrend } from "@/types"

const STABLE_RATE_THRESHOLD_CM_PER_HOUR = 0.3

/** Simple linear regression of level over time → slope in cm/hour. */
export function computeRatePerHour(readings: WaterReading[]): number {
  if (readings.length < 2) return 0

  const points = readings.map((r) => ({
    t: new Date(r.timestamp).getTime(),
    y: r.level,
  }))
  const n = points.length
  const meanT = points.reduce((sum, p) => sum + p.t, 0) / n
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n

  let numerator = 0
  let denominator = 0
  for (const p of points) {
    numerator += (p.t - meanT) * (p.y - meanY)
    denominator += (p.t - meanT) ** 2
  }
  if (denominator === 0) return 0

  const slopePerMs = numerator / denominator
  return slopePerMs * 3_600_000 // cm per hour
}

export function computeTrend(ratePerHour: number): WaterTrend {
  if (ratePerHour > STABLE_RATE_THRESHOLD_CM_PER_HOUR) return "rising"
  if (ratePerHour < -STABLE_RATE_THRESHOLD_CM_PER_HOUR) return "falling"
  return "stable"
}

export function computeSeverity(level: number, warningLevel: number, dangerLevel: number): WarningSeverity {
  if (level >= dangerLevel) return "danger"
  if (level >= warningLevel) return "warning"
  return "normal"
}

export function computeTimeToThreshold(
  currentLevel: number,
  ratePerHour: number,
  warningLevel: number,
  dangerLevel: number,
): TimeToThreshold {
  const target = currentLevel < warningLevel ? warningLevel : currentLevel < dangerLevel ? dangerLevel : null
  const targetLabel: TimeToThreshold["targetLabel"] = currentLevel < warningLevel ? "warning" : "danger"

  if (target === null || ratePerHour <= STABLE_RATE_THRESHOLD_CM_PER_HOUR) {
    return { targetLabel, days: null, hours: null, minutes: null, isStable: true }
  }

  const hoursRemaining = (target - currentLevel) / ratePerHour
  if (!Number.isFinite(hoursRemaining) || hoursRemaining < 0) {
    return { targetLabel, days: null, hours: null, minutes: null, isStable: true }
  }

  const totalMinutes = Math.round(hoursRemaining * 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  return { targetLabel, days, hours, minutes, isStable: false }
}
