import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'my-bar',
  description: '나의 주류 컬렉션 · 시세 · 테이스팅 노트',
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
