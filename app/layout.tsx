import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthNav } from "@/components/auth/auth-nav"
import { NavigationLinks } from "@/components/auth/navigation-links"
import Link from "next/link"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dinamiq - Construction Management System",
  description: "Manage your construction material requisitions efficiently with AI-powered insights",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
              <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-blue-100">
                <div className="container mx-auto px-4">
                  <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center">
                      <img src="/dinamiq-log.png" alt="Dinamiq Logo" className="h-8 w-auto" />
                    </Link>

                    <div className="flex items-center gap-2">
                      <NavigationLinks />
                      <AuthNav />
                    </div>
                  </div>
                </div>
              </nav>

              <main className="flex-1">{children}</main>
            </div>
            <footer className="w-full py-6 bg-white/80 backdrop-blur-md border-t border-blue-100 shadow-lg text-center text-gray-700 text-base font-medium">
              &copy; Dinamiq 2025 | Designed by <a href="https://www.ai101services.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">AI 101</a>
            </footer>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
