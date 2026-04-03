import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500']
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500']
})

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'VANTA - Wallet Security Daemon',
  description: 'Verifiable Autonomous Notary for Transaction Assurance. AI-powered wallet security that sits between your agents and the blockchain.',
  openGraph: {
    title: 'VANTA - Wallet Security Daemon',
    description:
      'Verifiable Autonomous Notary for Transaction Assurance. AI-powered wallet security that sits between your agents and the blockchain.',
    images: [{ url: '/vanta-dark-logo.png', width: 2000, height: 2000, alt: 'VANTA' }],
  },
  twitter: {
    card: 'summary',
    title: 'VANTA - Wallet Security Daemon',
    description:
      'Verifiable Autonomous Notary for Transaction Assurance. AI-powered wallet security that sits between your agents and the blockchain.',
    images: ['/vanta-dark-logo.png'],
  },
  icons: {
    icon: [
      {
        url: '/vanta-dark-logo.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/vanta-white-logo.png',
        media: '(prefers-color-scheme: dark)',
      },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/vanta-white-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#111111',
              border: '1px solid #1F1F1F',
              color: '#E5E5E5',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
