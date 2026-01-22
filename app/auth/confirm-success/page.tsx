"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Home } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ConfirmSuccess() {
  const [showDialog, setShowDialog] = useState(true)
  const router = useRouter()

  const handleClose = () => {
    setShowDialog(false)
    router.push("/")
  }

  // Prevent closing by clicking outside
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Dialog open={showDialog} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Email Confirmed Successfully</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Confirm email successfully you should be able to sign in to your account now.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleClose} className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
