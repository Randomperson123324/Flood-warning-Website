"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { useLanguage } from "@/hooks/language-context"

interface LanguageToggleProps {
  showTooltip?: boolean
}

export function LanguageToggle({ showTooltip: enableTooltip = true }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage()
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!enableTooltip) return
    
    // Show tooltip after component mounts
    const showTimer = setTimeout(() => {
      setShowTooltip(true)
    }, 1000) // Show after 1 second delay

    // Hide tooltip after 10 seconds
    const hideTimer = setTimeout(() => {
      setShowTooltip(false)
    }, 11000) // 1 second delay + 10 seconds visible = 11 seconds total

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [enableTooltip])

  // Get tooltip message based on current language
  const getTooltipMessage = () => {
    if (language === "en") {
      return "อ่านภาษาอังกฤษไม่ออก? เปลี่ยนภาษาตรงนี้เลย!"
    } else {
      return "Don't know Thai? Change language here"
    }
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="bg-transparent">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Toggle language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setLanguage("en")}>English</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLanguage("th")}>ไทย</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom tooltip - positioned below and properly contained */}
      {enableTooltip && showTooltip && (
        <div className="absolute top-12 -right-2 sm:right-0 bg-gray-900 text-white text-xs px-2 py-1 p-4 rounded-tr-lg rounded-bl-2xl shadow-lg z-50 animate-in fade-in-0 zoom-in-95 w-40 sm:w-auto sm:whitespace-nowrap">
          <div className="text-center sm:text-left">{getTooltipMessage()}</div>
          <div className="absolute -top-1 right-6 sm:right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
        </div>
      )}
    </div>
  )
}
