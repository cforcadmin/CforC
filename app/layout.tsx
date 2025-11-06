import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Culture for Change',
  description: 'First Greek social innovation network for cultural and political change',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  )
}
