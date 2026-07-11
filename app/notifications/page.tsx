import { Header } from "@/components/header"
import { NotificationPermissionCard } from "@/components/notifications/notification-permission-card"
import { SensorStatusList } from "@/components/notifications/sensor-status-list"
import { AnnouncementsList } from "@/components/notifications/announcements-list"

export default function NotificationsPage() {
  return (
    <main className="min-h-dvh pb-16">
      <Header />
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-4 sm:px-6">
        <NotificationPermissionCard />
        <SensorStatusList />
        <AnnouncementsList />
      </div>
    </main>
  )
}
