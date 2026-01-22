"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wifi, WifiOff, Database, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { useLanguage } from "@/hooks/language-context"

interface SystemStatusProps {
  isConnected: boolean
  lastUpdateTime: Date | null
  onTestConnection: () => Promise<boolean>
}

export function SystemStatus({ isConnected, lastUpdateTime, onTestConnection }: SystemStatusProps) {
  const [isTesting, setIsTesting] = useState(false)
  const { t } = useLanguage()

  const handleTestConnection = async () => {
    setIsTesting(true)
    await onTestConnection()
    setIsTesting(false)
  }

  const getTimeSinceUpdate = () => {
    if (!lastUpdateTime) return t.cards.stable

    const now = new Date()
    const diffMs = now.getTime() - lastUpdateTime.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return t.cards.realTime
    if (diffMinutes < 60) return `${diffMinutes}${t.system.minutesAgo}`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}${t.system.hoursAgo}`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}${t.system.daysAgo}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-600" />
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                {t.system.online}
              </Badge>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-600" />
              <Badge variant="destructive">{t.system.offline}</Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t.system.systemStatus}
            </CardTitle>
            <CardDescription>{t.system.databaseHealth}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.system.databaseConnection}</span>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">{t.system.connected}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">{t.system.disconnected}</span>
                  </>
                )}
              </div>
            </div>



            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.system.realTimeUpdates}</span>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-green-600">{t.system.active}</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 bg-red-500 rounded-full" />
                    <span className="text-sm text-red-600">{t.system.inactive}</span>
                  </>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting}
                size="sm"
                className="w-full bg-transparent"
                variant="outline"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t.system.testing}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.system.testConnection}
                  </>
                )}
              </Button>
            </div>


          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
