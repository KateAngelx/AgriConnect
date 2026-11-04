import { Suspense } from 'react'
import { FloatingAiAssistant } from '@/components/floating-ai-assistant'
import { InstallAppToast } from '@/components/install-app-toast'
import { RouteFeedbackToast } from '@/components/ui-feedback'
import { currentUser } from '@/server/auth'
import { ready } from '@/server/sync'
import './styles.css'

const title = 'AgriConnect | Filipino Agricultural Marketplace'
const description =
  'Fresh agricultural products from local Filipino farmers, available for pickup or delivery.'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f3f8ef',
}

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title,
  description,
  applicationName: 'AgriConnect',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'AgriConnect',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: { title, description },
}

export default async function RootLayout({ children }) {
  await ready()
  const user = await currentUser()
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-[#f3f8ef] text-[#142016] antialiased" suppressHydrationWarning>
        <a className="skip-link" href="#root">
          Skip to content
        </a>
        <div id="root" tabIndex={-1}>
          {children}
          <Suspense fallback={null}><RouteFeedbackToast /></Suspense>
          <InstallAppToast />
          <FloatingAiAssistant user={user} />
        </div>
      </body>
    </html>
  )
}
