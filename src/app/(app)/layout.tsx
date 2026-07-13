import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  )
}
