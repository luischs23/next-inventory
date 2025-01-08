import { Skeleton } from "app/components/ui/skeleton"
import { Card } from "app/components/ui/card"
import { Store, Warehouse, FileText, Users, User } from 'lucide-react'

export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-blue-100">
      {/* Header */}
      <header className="w-full p-4 flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center">
          <div className="flex flex-col items-end mr-2">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="w-10 h-10 rounded-md" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 bg-white rounded-3xl shadow-xl">
          <Skeleton className="h-6 w-40 mb-6" />
          <div className="grid grid-cols-3 gap-4">
            {[Store, Warehouse, FileText, Users, User].map((Icon, index) => (
              <div key={index} className="w-full h-24 flex flex-col items-center justify-center">
                <Skeleton className="w-8 h-8 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  )
}

