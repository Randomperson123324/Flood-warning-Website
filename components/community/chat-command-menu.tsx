"use client"

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface ChatCommandMenuProps<T> {
  anchorRef: RefObject<HTMLElement | null>
  items: T[]
  getKey: (item: T) => string
  highlightedIndex: number
  onHover: (index: number) => void
  onSelect: (item: T) => void
  renderItem: (item: T, highlighted: boolean) => ReactNode
  emptyMessage?: string
  header?: ReactNode
}

/**
 * Autocomplete popover for `/` chat commands — mirrors GlassDropdown's
 * portal-to-body positioning trick (the chat panel's scroll area has
 * overflow-hidden for the glass specular highlight, which would clip an
 * absolutely-positioned menu), but anchors ABOVE the input since the
 * composer sits at the bottom of the chat panel.
 */
export function ChatCommandMenu<T>({
  anchorRef,
  items,
  getKey,
  highlightedIndex,
  onHover,
  onSelect,
  renderItem,
  emptyMessage,
  header,
}: ChatCommandMenuProps<T>) {
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ bottom: number; left: number; width: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left, width: rect.width })
    }
    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [anchorRef])

  // Keep the highlighted row scrolled into view during keyboard navigation.
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const active = menu.querySelector<HTMLElement>('[data-highlighted="true"]')
    active?.scrollIntoView({ block: "nearest" })
  }, [highlightedIndex])

  if (!mounted || !pos) return null

  return createPortal(
    <div
      ref={menuRef}
      role="listbox"
      style={{ position: "fixed", bottom: pos.bottom, left: pos.left, width: pos.width }}
      className="glass-panel-strong animate-fade-in-up z-[100] max-h-64 overflow-y-auto p-1"
    >
      {header && <div className="px-2.5 py-1.5 text-xs font-medium text-ink-soft">{header}</div>}

      {items.length === 0 && emptyMessage && <p className="px-3 py-2.5 text-sm text-ink-soft">{emptyMessage}</p>}

      {items.map((item, i) => (
        <button
          key={getKey(item)}
          type="button"
          role="option"
          aria-selected={i === highlightedIndex}
          data-highlighted={i === highlightedIndex}
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => {
            // mousedown (not click) so it fires before the input's onBlur
            e.preventDefault()
            onSelect(item)
          }}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-glass-sm px-2.5 py-2 text-left text-sm outline-none transition-colors duration-150",
            i === highlightedIndex ? "bg-accent/10 text-accent" : "text-ink hover:bg-surface-strong/60",
          )}
        >
          {renderItem(item, i === highlightedIndex)}
        </button>
      ))}
    </div>,
    document.body,
  )
}
