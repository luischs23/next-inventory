'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors relative w-12 h-6"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Sun className="h-4 w-4 text-yellow-500 transition-all dark:text-yellow-300 dark:opacity-0 dark:translate-x-2" />
        <Moon className="absolute h-4 w-4 text-gray-300 transition-all opacity-0 -translate-x-2 dark:opacity-100 dark:translate-x-0" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}