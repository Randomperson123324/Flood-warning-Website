import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"

export default function ConfirmSuccessPage() {
  return (
    <AuthShell title="ยืนยันอีเมลสำเร็จ" subtitle="">
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-status-normal" />
        <p className="text-sm text-ink-soft">บัญชีของคุณพร้อมใช้งานแล้ว เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        <Link
          href="/auth/login"
          className="glass-panel-strong w-full py-2.5 text-center font-medium text-accent transition-transform duration-300 ease-glass hover:scale-[1.02]"
        >
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </AuthShell>
  )
}
