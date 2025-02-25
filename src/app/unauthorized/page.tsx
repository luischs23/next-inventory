"use client"

import { useRouter } from "next/navigation"
import { Button } from "app/components/ui/button"

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-4xl font-bold mb-4">Unauthorized Access</h1>
      <p className="text-xl mb-8">You do not have permission to view this page.</p>
      <Button onClick={() => router.push("/")}>Return to Home</Button>
    </div>
  )
}