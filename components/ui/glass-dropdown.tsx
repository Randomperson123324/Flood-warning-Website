"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GlassDropdownOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface GlassDropdownProps<T extends string> {
  value: T
  options: GlassDropdownOption<T>[]
  onChange: (value: T) => void
  triggerIcon?: ReactNode
  /** Overrides the trigger's visible text — defaults to the selected option's label. */
  triggerLabel?: string
  /** Hides the trigger label below the `sm` breakpoint, showing icon-only. */
  hideLabelOnMobile?: boolean
  align?: "left" | "right"
  /** "up" opens the menu above the trigger — for triggers near the bottom of the viewport (e.g. the sidebar footer). */
  direction?: "down" | "up"
  /** Stretches the trigger to fill its container instead of hugging its content. */
  fullWidth?: boolean
  menuClassName?: string
  className?: string
  ariaLabel?: string
}

/**
 * Shared styled dropdown for anything that used to be a native <select> or a
 * click-to-cycle button (theme, language, sensor picker).
 *
 * The menu is rendered through a portal into document.body, positioned with
 * `position: fixed` from the trigger's measured screen coordinates — NOT
 * absolutely-positioned inside the trigger's own DOM subtree. Every trigger
 * lives inside a `.glass-panel`/`.glass-panel-strong` ancestor, and those
 * have `overflow: hidden` (required for the glass specular-highlight
 * pseudo-element). An absolutely-positioned menu nested in there gets
 * silently clipped by that ancestor — it renders, just invisibly, which is
 * what looked like "the menu is stuck behind something, can't click it."
 * Portaling to body sidesteps that clipping entirely.
 */
export function GlassDropdown<T extends string>({
  value,
  options,
  onChange,
  triggerIcon,
  triggerLabel,
  hideLabelOnMobile,
  align = "right",
  direction = "down",
  fullWidth,
  menuClassName,
  className,
  ariaLabel,
}: GlassDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => setMounted(true), [])

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuPos({
      ...(direction === "up" ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
      ...(align === "right" ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    })
  }

  useEffect(() => {
    if (!open) return
    updatePosition()

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    document.addEventListener("mousedown", onClickOutside)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
      document.removeEventListener("mousedown", onClickOutside)
      document.removeEventListener("keydown", onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, direction])

  return (
    <div ref={rootRef} className={cn("relative", fullWidth ? "block w-full" : "inline-block")}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "glass-panel-strong glass-interactive flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink",
          fullWidth && "w-full",
          className,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {triggerIcon}
        <span className={cn(hideLabelOnMobile && "hidden sm:inline", "truncate", fullWidth && "flex-1 text-left")}>
          {triggerLabel ?? selected?.label}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform duration-200", open && "rotate-180")} />
      </button>

      {mounted &&
        open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{ position: "fixed", top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, right: menuPos.right }}
            className={cn(
              "glass-panel-strong animate-fade-in-up z-[100] max-h-[60vh] min-w-[12rem] max-w-[18rem] overflow-y-auto p-1",
              menuClassName,
            )}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-glass-sm px-3 py-2 text-left text-sm outline-none transition-colors duration-150 hover:bg-surface-strong/60 focus-visible:bg-surface-strong/60",
                  opt.value === value ? "bg-accent/10 text-accent" : "text-ink",
                )}
              >
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
