"use client"

import { useState } from "react"
import Link from "next/link"
import { LoaderCircle, MailCheck } from "lucide-react"
import { AuthShell, FieldLabel, glassInputClass } from "@/components/auth/auth-shell"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { useAuth } from "@/hooks/use-auth"
import { allowedDomainsLabel, isEmailDomainAllowed } from "@/lib/auth/email-domain"

export default function SignupPage() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileAvailable, setTurnstileAvailable] = useState<boolean | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)

  const domainsLabel = allowedDomainsLabel()
  const needsTurnstile = turnstileAvailable === true
  const canSubmit = email && username && password.length >= 6 && (!needsTurnstile || turnstileToken)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isEmailDomainAllowed(email)) {
      setError(`อีเมลต้องเป็น ${domainsLabel} เท่านั้น`)
      return
    }
    setSubmitting(true)
    setError(null)
    const { error } = await signUp({ email, password, username, captchaToken: turnstileToken })
    setSubmitting(false)
    if (error) {
      setError(error)
      setTurnstileToken("")
      setTurnstileReset((n) => n + 1)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <AuthShell title="ตรวจสอบอีเมลของคุณ" subtitle="">
        <div className="flex flex-col items-center gap-3 text-center text-sm text-ink-soft">
          <MailCheck className="h-8 w-8 text-status-normal" />
          <p>
            เราส่งลิงก์ยืนยันไปที่ <span className="font-medium text-ink">{email}</span> แล้ว คลิกลิงก์เพื่อเปิดใช้งานบัญชี
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="สมัครสมาชิก" subtitle={domainsLabel ? `จำกัดเฉพาะอีเมล ${domainsLabel}` : "สมัครด้วยอีเมลของคุณ"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FieldLabel>ชื่อผู้ใช้</FieldLabel>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required className={glassInputClass} />
        </div>
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
          <FieldLabel>รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</FieldLabel>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={glassInputClass}
            autoComplete="new-password"
          />
        </div>

        <TurnstileWidget
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken("")}
          onAvailability={setTurnstileAvailable}
          resetKey={turnstileReset}
        />

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="glass-panel-strong flex items-center justify-center gap-2 py-2.5 font-medium text-accent transition-transform duration-300 ease-glass hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
        >
          {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
          สมัครสมาชิก
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        มีบัญชีแล้ว?{" "}
        <Link href="/auth/login" className="font-medium text-accent">
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthShell>
  )
}
