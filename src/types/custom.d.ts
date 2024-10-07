import { User } from "next-auth"

export interface CustomUser extends User {
  companyId: string
  role: string
  isFirstLogin: boolean
}