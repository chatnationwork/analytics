import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Content */}
      <div className="flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white dark:bg-gray-900">
        <div className="mx-auto w-full max-w-sm lg:w-[400px]">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">S</div>
            <span className="text-xl font-bold dark:text-white"><Link href="/">Shuru Connect</Link></span>
          </div>
          {children}
        </div>
      </div>

      {/* Right: Background */}
      <div className="hidden lg:block relative bg-[var(--primary-dark)]">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-dark)] to-transparent opacity-90" />
        <div className="absolute inset-0 flex items-center justify-center p-20 text-white">
          <div>
            <h2 className="text-4xl font-bold mb-6">Insightful Analytics for Shuru Connect</h2>
            <p className="text-lg text-gray-200">Track user journeys, monitor conversions seamlessly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
