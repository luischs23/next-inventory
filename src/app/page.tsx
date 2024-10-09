import HomePage from "./companies/[companyId]/store/page";

export default function Home() {
  return (
    <div className="grid grid-rows-[12px_1fr_12px] items-center justify-items-center min-h-screen p-2 pb-6 sm:p-4 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <HomePage/>
      </main>
    </div>
  )
}
