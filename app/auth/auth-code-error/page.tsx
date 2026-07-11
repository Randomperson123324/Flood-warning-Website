import Link from "next/link"
import { TriangleAlert } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"

export default function AuthCodeErrorPage() {
  return (
    <AuthShell title="ยืนยันอีเมลไม่สำเร็จ" subtitle="">
      <div className="flex flex-col items-center gap-4 text-center">
        <TriangleAlert className="h-10 w-10 text-status-danger" />
        <p className="text-sm text-ink-soft">ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว ลองสมัครสมาชิกใหม่อีกครั้ง</p>
        <Link
          href="/auth/signup"
          className="glass-panel-strong w-full py-2.5 text-center font-medium text-accent transition-transform duration-300 ease-glass hover:scale-[1.02]"
        >
          สมัครสมาชิกใหม่
        </Link>
      </div>
    </AuthShell>
  )
}
