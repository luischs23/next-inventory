import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      companyId: string
      isFirstLogin: boolean
    }
  }
  interface User {
    role?: string
    companyId?: string
    isFirstLogin?: boolean
  }
}