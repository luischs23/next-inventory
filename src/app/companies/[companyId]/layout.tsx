
import React from 'react'
import CompanyNavbar from 'app/app/companies/[companyId]/CompanyNabvar'
import { CompanySidebar } from 'app/app/companies/[companyId]/CompanySidebar'

interface CompanyLayoutProps {
  children: React.ReactNode
  params: { companyId: string }
}

export default function CompanyLayout({ children, params }: CompanyLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        {/* Sidebar for desktop */}
        <div className="hidden md:block">
          <CompanySidebar companyId={params.companyId} />
        </div>

        {/* Main content area */}
        <div className="flex flex-col flex-1">
          {/* Navbar for mobile */}
          <div className="md:hidden">
            <CompanyNavbar companyId={params.companyId} />
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}