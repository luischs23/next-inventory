"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "app/services/firebase/firebase.config"
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Card, CardContent } from "app/components/ui/card"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { toast } from "app/components/ui/use-toast"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await sendPasswordResetEmail(auth, email)
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for instructions to reset your password.",
        variant: "destructive",
        duration: 500,
        style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        
      })
      router.push("/login")
    } catch (error) {
      console.error("Password reset error:", error)
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-[400px] shadow-lg p-4">
        <CardContent className="flex justify-center items-center">
          <form onSubmit={handleResetPassword} className="space-y-6 w-full">
            <div className="space-y-4">
              <div className="text-2xl font-bold text-center mt-6">Forgot Password</div>
              <div className="text-sm text-center text-gray-600">
                Enter your email address and well send you instructions to reset your password.
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                "Send Reset Instructions"
              )}
            </Button>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-center">
                <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Back to Login
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}