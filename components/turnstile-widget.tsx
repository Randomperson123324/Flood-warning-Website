"use client"

import { useEffect, useRef, useState } from "react"

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  /** Fired once, on mount, telling the caller whether Turnstile is even
   * configured — lets forms skip requiring a token entirely when it's not. */
  onAvailability?: (available: boolean) => void
  /** Change this value (e.g. increment a counter) to force the widget to
   * issue a fresh challenge. Needed after a failed submit because Turnstile
   * tokens are single-use once Supabase has verified them. */
  resetKey?: number
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          "error-callback"?: (code: string) => void
          "expired-callback"?: () => void
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js"

export function TurnstileWidget({ onVerify, onExpire, onAvailability, resetKey = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [siteKey, setSiteKey] = useState<string | null>(null)

  // Keep the latest callbacks in refs so the render effect never re-runs
  // when the parent passes new inline function props (which would tear down
  // and recreate the widget, causing flicker).
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)
  const onAvailabilityRef = useRef(onAvailability)
  useEffect(() => {
    onVerifyRef.current = onVerify
    onExpireRef.current = onExpire
    onAvailabilityRef.current = onAvailability
  })

  useEffect(() => {
    let cancelled = false
    fetch("/api/turnstile-sitekey")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return
        setSiteKey(data.siteKey)
        onAvailabilityRef.current?.(true)
      })
      .catch(() => {
        if (!cancelled) onAvailabilityRef.current?.(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    function render() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        callback: (token: string) => onVerifyRef.current(token),
        "expired-callback": () => onExpireRef.current?.(),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      const script = document.createElement("script")
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      script.onload = render
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [resetKey])

  if (!siteKey) return null

  return <div ref={containerRef} className="my-1" />
}
