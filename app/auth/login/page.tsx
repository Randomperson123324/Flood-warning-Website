"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LoaderCircle } from "lucide-react"
import { AuthShell, FieldLabel, glassInputClass } from "@/components/auth/auth-shell"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn({ email, password })
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    router.push("/")
  }

  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="ล็อกอินเพื่อพูดคุยและแจ้งเหตุกับชุมชน">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FieldLabel>อีเมล</FieldLabel>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={glassInputClass}
            autoComplete="email"
          />
        </div>
        <div>
          <FieldLabel>รหัสผ่าน</FieldLabel>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={glassInputClass}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="glass-panel-strong flex items-center justify-center gap-2 py-2.5 font-medium text-accent transition-transform duration-300 ease-glass hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
        >
          {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
          เข้าสู่ระบบ
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        ยังไม่มีบัญชี?{" "}
        <Link href="/auth/signup" className="font-medium text-accent">
          สมัครสมาชิก
        </Link>
      </p>
    </AuthShell>
  )
}
