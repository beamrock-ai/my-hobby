import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '취미',
  description: '취미 기록 · 관리',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  )
}
