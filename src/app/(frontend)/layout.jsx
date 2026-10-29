import { FloatingAiAssistant } from '@/components/floating-ai-assistant'
import { currentUser } from '@/server/auth'
import { ready } from '@/server/sync'
import './styles.css'

const title = 'AgriConnect | Filipino Agricultural Marketplace'
const description =
  'Fresh agricultural products from local Filipino farmers, available for pickup or delivery.'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title,
  description,
  openGraph: { title, description },
}

export default async function RootLayout({ children }) {
  await ready()
  const user = await currentUser()
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen bg-[#f7f7f2] text-[#142016] antialiased" suppressHydrationWarning>
        <a className="skip-link" href="#root">
          Skip to content
        </a>
        <div id="root" tabIndex={-1}>
          {children}
          <FloatingAiAssistant user={user} />
        </div>
      </body>
    </html>
  )
}
