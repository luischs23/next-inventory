import CompanyNavbar from 'app/app/companies/[companyId]/CompanyNabvar'

export default function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { companyId: string };
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <CompanyNavbar companyId={params.companyId} />
        <main className="flex-1 md:ml-16">{children}</main>
      </div>
    </div>
  );
}