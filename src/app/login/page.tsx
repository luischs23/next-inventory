"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "app/services/firebase/firebase.config";
import { getUserData, findUserByEmail } from "app/services/firebase/auth-service";
import { Button } from "app/components/ui/button";
import { Input } from "app/components/ui/input";
import { Label } from "app/components/ui/label";
import { Card, CardContent } from "app/components/ui/card";
import { useAuth } from "app/app/context/AuthContext";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "app/components/ui/alert-dialog";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setNeedsVerification(false);
    setVerificationSent(false);
    setRegisteredUser(false);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        // Verificar si el usuario está en la base de datos antes de habilitar el botón de reenviar correo
        const userData = await findUserByEmail(email);
        if (userData) {
          setRegisteredUser(true);
        }
        setNeedsVerification(true);
        setLoading(false);
        return;
      }

      const userData = await getUserData(firebaseUser);
      if (!userData) {
        console.warn("User account not found in the system");
        setError("User account not found. Please contact support.");
        setLoading(false);
        return;
      }

      if (userData.status === "deleted") {
        throw new Error("This account has been deactivated. Please contact support for assistance.");
      }

      const token = await firebaseUser.getIdToken(true);
      setUser({
        ...firebaseUser,
        id: userData.id,
        companyId: userData.companyId,
        role: userData.role,
        name: userData.name,
        token: token,
        status: userData.status,
        isDeveloper: userData.isDeveloper,
      });

      if (userData.isDeveloper) {
        router.push("/companies");
      } else if (userData.companyId) {
        router.push(`/companies/${userData.companyId}/home`);
      } else {
        throw new Error("User not associated with any company");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : "Failed to log in. Please check your credentials.");
      setLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    try {
      setLoading(true);
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setError("User not authenticated.");
        return;
      }

      // Confirmar si el usuario está en la base de datos antes de enviar el email
      const userData = await findUserByEmail(email);
      if (!userData) {
        setError("User not registered in the system.");
        setLoading(false);
        return;
      }

      await sendEmailVerification(firebaseUser);
      setVerificationSent(true);
      console.log("📧 Verification email sent to:", email);
    } catch (error) {
      console.error("Error sending verification email:", error);
      setError(error instanceof Error ? error.message : "Failed to send verification email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardContent className="flex justify-center items-center">
          {needsVerification ? (
            <div className="space-y-6 w-full py-6">
              <AlertDialog open={needsVerification}>
                <AlertDialogContent>
                  <AlertDialogTitle>Email Verification Required</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your email address has not been verified. Please check your inbox for a verification email or
                    request a new one.
                  </AlertDialogDescription>
                </AlertDialogContent>
              </AlertDialog>

              {verificationSent && (
                <AlertDialog open={verificationSent}>
                  <AlertDialogContent>
                    <AlertDialogTitle>Verification Email Sent</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please check your inbox and click the verification link. Then try logging in again.
                    </AlertDialogDescription>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <div className="flex flex-col gap-4">
                {registeredUser && (
                  <Button onClick={handleSendVerificationEmail} className="w-full" disabled={loading || verificationSent}>
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      "Resend Verification Email"
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    setNeedsVerification(false);
                    setVerificationSent(false);
                  }}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6 w-full py-6">
              <div className="space-y-4">
                <div className="text-2xl font-bold text-center">Welcome Back</div>
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
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full"
                  />
                </div>
              </div>

              {error && <div className="text-sm text-red-500 text-center">{error}</div>}

              <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Logging in...</span>
                  </div>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
