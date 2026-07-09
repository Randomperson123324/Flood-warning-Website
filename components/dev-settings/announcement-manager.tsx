"use client"

import { useState } from "react"
import { Plus, Power, Trash2, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useManageAnnouncements } from "@/hooks/use-manage-announcements"
import { glassInputClass } from "@/components/auth/auth-shell"

const TYPES = [
  { value: "banner", key: "typeBanner" as const },
  { value: "popup", key: "typePopup" as const },
]

export function AnnouncementManager() {
  const { t } = useLanguage()
  const { announcements, loading, createAnnouncement, toggleActive, deleteAnnouncement } = useManageAnnouncements()
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState("")
  const [type, setType] = useState("banner")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = await createAnnouncement({ message, type, is_active: true })
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage("")
    setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm ? (
        <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("devSettings", "add")}</p>
            <button type="button" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4 text-ink-soft" />
            </button>
          </div>

          <textarea
            placeholder={t("devSettings", "message")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            required
            className={`${glassInputClass} resize-none`}
          />

          <div className="flex gap-2">
            {TYPES.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`glass-panel-strong flex-1 py-2 text-xs font-medium ${type === opt.value ? "ring-1 ring-accent text-accent" : "text-ink-soft"}`}
              >
                {t("devSettings", opt.key)}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-status-danger">{error}</p>}

          <button type="submit" className="glass-panel-strong py-2.5 text-sm font-medium text-accent">
            {t("devSettings", "save")}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="glass-panel-strong flex w-fit items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent"
        >
          <Plus className="h-4 w-4" />
          {t("devSettings", "add")}
        </button>
      )}

      {!loading && announcements.length === 0 && <p className="text-sm text-ink-soft">{t("devSettings", "noItems")}</p>}

      <div className="flex flex-col gap-2">
        {announcements.map((a) => (
          <div key={a.id} className="glass-panel flex items-center justify-between gap-3 p-4">
            <div>
              <p className={a.is_active ? "" : "text-ink-soft line-through"}>{a.message}</p>
              <p className="text-xs text-ink-soft">{a.type}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleActive(a.id, !a.is_active)}
                className={`rounded-full p-2 ${a.is_active ? "text-status-normal" : "text-ink-soft"}`}
                title={a.is_active ? t("devSettings", "deactivate") : t("devSettings", "activate")}
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => confirm(t("devSettings", "confirmDelete")) && deleteAnnouncement(a.id)}
                className="rounded-full p-2 text-ink-soft hover:text-status-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
