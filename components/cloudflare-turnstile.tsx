"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface CloudflareTurnstileProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (code: string) => void
}

declare global {
  interface Window {
    onloadTurnstileCallback: () => void
    turnstile: {
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

export function CloudflareTurnstile({ onVerify, onExpire, onError }: CloudflareTurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSiteKey = async () => {
      try {
        const response = await fetch("/api/turnstile-sitekey")
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || "Failed to fetch Turnstile site key.")
        }
        const data = await response.json()
        setSiteKey(data.siteKey)
      } catch (err: any) {
        console.error("Error fetching Turnstile site key:", err.message)
        setFetchError(err.message)
        onError?.("fetch_error")
      }
    }

    fetchSiteKey()
  }, [onError])

  const memoizedOnVerify = useCallback(onVerify, [onVerify])
  const memoizedOnExpire = useCallback(onExpire || (() => {}), [onExpire])
  const memoizedOnError = useCallback(onError || (() => {}), [onError])

  useEffect(() => {
    if (!siteKey || fetchError) {
      return
    }

    if (widgetIdRef.current && containerRef.current?.querySelector("iframe[src*='challenges.cloudflare.com']")) {
      return
    }

    if (!window.turnstile) {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback"
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    window.onloadTurnstileCallback = () => {
      if (containerRef.current && window.turnstile && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: memoizedOnVerify,
          "error-callback": (code: string) => {
            memoizedOnError(code)
            if (widgetIdRef.current && window.turnstile) {
              window.turnstile.reset(widgetIdRef.current)
            }
          },
          "expired-callback": memoizedOnExpire,
        })
      }
    }

    if (window.turnstile && containerRef.current) {
      window.onloadTurnstileCallback()
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
      if (Object.keys(window).filter((key) => key.startsWith("__turnstile_widget")).length === 0) {
        delete window.onloadTurnstileCallback
      }
    }
  }, [siteKey, fetchError])

  if (fetchError) {
    return <div className="text-red-500 text-sm">Error loading CAPTCHA: {fetchError}</div>
  }

  if (!siteKey) {
    return <div className="text-gray-500 text-sm">Loading CAPTCHA...</div>
  }

  return <div ref={containerRef} className="cf-turnstile" />
}
