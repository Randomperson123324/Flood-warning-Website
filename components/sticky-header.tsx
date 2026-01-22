"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Waves, BarChart3, Cloud, MessageCircle } from "lucide-react"
import { useLanguage } from "../hooks/language-context"
import { LanguageToggle } from "./language-toggle"

interface StickyHeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function StickyHeader({
  activeTab,
  onTabChange,
}: StickyHeaderProps) {
  const { t } = useLanguage()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "overview":
        return <Waves className="h-4 w-4" />
      case "analytics":
        return <BarChart3 className="h-4 w-4" />
      case "weather":
        return <Cloud className="h-4 w-4" />
      case "community":
        return <MessageCircle className="h-4 w-4" />
      default:
        return <Waves className="h-4 w-4" />
    }
  }

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "overview":
        return t.tabstitle.overview
      case "analytics":
        return t.tabstitle.analytics
      case "weather":
        return t.tabstitle.weather
      case "community":
        return t.tabstitle.community
      default:
        return t.tabstitle.overview
    }
  }


  return (
    <div className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/10 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 shadow-sm transform transition-transform duration-300 ease-out ${isScrolled ? "translate-y-0" : "-translate-y-full pointer-events-none"}`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Active tab title and navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getTabIcon(activeTab)}
              <span className="font-medium">{getTabTitle(activeTab)}</span>
            </div>

            {/* Tab navigation icons */}
            <div className="flex items-center gap-1">
              {["overview", "analytics", "weather", "community"].map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(tab)}
                  className="p-2"
                  title={getTabTitle(tab)}
                >
                  {getTabIcon(tab)}
                </Button>
              ))}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <LanguageToggle showTooltip={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
