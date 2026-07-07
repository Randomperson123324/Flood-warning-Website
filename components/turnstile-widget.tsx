"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  /** Fired once, on mount, telling the caller whether Turnstile is even
   * configured — lets forms skip requiring a token entirely when it's not. */
  onAvailability?: (available: boolean) => void
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

export function TurnstileWidget({ onVerify, onExpire, onAvailability }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [siteKey, setSiteKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/turnstile-sitekey")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return
        setSiteKey(data.siteKey)
        onAvailability?.(true)
      })
      .catch(() => {
        if (!cancelled) onAvailability?.(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVerify = useCallback((token: string) => onVerify(token), [onVerify])
  const handleExpire = useCallback(() => onExpire?.(), [onExpire])

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    function render() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        callback: handleVerify,
        "expired-callback": handleExpire,
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
  }, [siteKey, handleVerify, handleExpire])

  if (!siteKey) return null

  return <div ref={containerRef} className="my-1" />
}
