"use client"

import { useState } from "react"
import { CloudRain, Sun } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useWeatherVote } from "@/hooks/use-weather-vote"
import { cn } from "@/lib/utils"

export function WeatherVoteWidget({ location }: { location: string }) {
  const { t } = useLanguage()
  const { tally, hasVotedRecently, submitting, vote } = useWeatherVote(location)
  const [justVoted, setJustVoted] = useState<boolean | null>(null)

  async function handleVote(isRaining: boolean) {
    const { error } = await vote(isRaining)
    if (!error) setJustVoted(isRaining)
  }

  return (
    <div className="glass-panel animate-fade-in-up p-5">
      <p className="mb-3 text-sm font-medium text-ink-soft">{t("weatherVote", "question")}</p>

      {hasVotedRecently || justVoted !== null ? (
        <p className="text-sm text-status-normal">{t("weatherVote", "thanks")}</p>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleVote(true)}
            className="glass-panel-strong flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-transform duration-300 ease-glass hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            <CloudRain className="h-4 w-4 text-accent" />
            {t("weatherVote", "yes")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleVote(false)}
            className="glass-panel-strong flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-transform duration-300 ease-glass hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            <Sun className="h-4 w-4 text-status-warning" />
            {t("weatherVote", "no")}
          </button>
        </div>
      )}

      {tally && tally.totalValidVotes > 0 && (
        <div className="mt-4">
          <div className={cn("h-2 overflow-hidden rounded-full bg-surface-strong")}>
            <div
              className="h-full rounded-full bg-accent transition-all duration-700 ease-glass"
              style={{ width: `${tally.rainPercentage}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            {tally.rainPercentage}% ({tally.totalValidVotes}) {t("weatherVote", "resultsRaining")}
          </p>
        </div>
      )}
    </div>
  )
}
