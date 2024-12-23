'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'app/app/context/AuthContext'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/login')
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  return router.push('/landing')
}