"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Waves, BarChart3, Cloud, MessageCircle, ChevronLeft, ChevronRight, Menu } from "lucide-react"
import { useLanguage } from "../hooks/language-context"
import { LanguageToggle } from "./language-toggle"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isExpanded: boolean
  onToggle: () => void
}

export function Sidebar({
  activeTab,
  onTabChange,
  isExpanded,
  onToggle,
}: SidebarProps) {
  const { t } = useLanguage()

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "overview":
        return <Waves className="h-5 w-5" />
      case "analytics":
        return <BarChart3 className="h-5 w-5" />
      case "weather":
        return <Cloud className="h-5 w-5" />
      case "community":
        return <MessageCircle className="h-5 w-5" />
      default:
        return <Waves className="h-5 w-5" />
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
    <div
      className={cn(
        "hidden md:flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl h-screen fixed left-0 top-0 transition-all duration-300 ease-in-out z-[60]",
        isExpanded ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center justify-between p-4 h-16 border-b border-gray-200 dark:border-gray-700">
        {isExpanded && <span className="font-bold text-xl truncate">StreeFlood Project</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn("hover:bg-gray-100 dark:hover:bg-gray-800", !isExpanded && "mx-auto")}
        >
          {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 px-2">
        {["overview", "analytics", "weather", "community"].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "secondary" : "ghost"}
            size={isExpanded ? "default" : "icon"}
            onClick={() => onTabChange(tab)}
            className={cn(
              "justify-start transition-all",
              activeTab === tab ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "",
              !isExpanded && "justify-center px-0"
            )}
            title={!isExpanded ? getTabTitle(tab) : undefined}
          >
            {getTabIcon(tab)}
            {isExpanded && <span className="ml-3">{getTabTitle(tab)}</span>}
          </Button>
        ))}
      </div>


    </div>
  )
}
