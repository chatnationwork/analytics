import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation | Analytics',
  description: 'Learn how to integrate analytics into your applications',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white">
                A
              </div>
              <span className="font-semibold text-foreground">Analytics</span>
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/showcase" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Preview
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Dashboard
            </Link>
            <Link 
              href="/signup"
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border min-h-[calc(100vh-65px)] p-6 hidden lg:block sticky top-16 bg-background">
          <nav className="space-y-1">
            <SidebarLink href="/docs" label="Getting Started" />
            <SidebarLink href="/docs/quickstart" label="Quick Start" />
            <SidebarLink href="/docs/sdk" label="JavaScript SDK" />
            <SidebarLink href="/docs/api" label="REST API" />
            <SidebarLink href="/docs/whatsapp" label="WhatsApp Integration" />
            <SidebarLink href="/docs/ai" label="AI Integration" />
          </nav>
          <div className="mt-8 pt-6 border-t border-border">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
    >
      {label}
    </Link>
  );
}
