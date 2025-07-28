import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthNav } from "@/components/auth/auth-nav"
import Link from "next/link"
import { Home, FileText, Plus } from "lucide-react"

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
                      <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      >
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/catalog"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                      >
                        <FileText className="h-4 w-4" />
                        Catalog
                      </Link>
                      <Link
                        href="/requisitions"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      >
                        <FileText className="h-4 w-4" />
                        Requisitions
                      </Link>
                                          <Link
                      href="/requisitions/new"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Plus className="h-4 w-4" />
                      New
                    </Link>
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
