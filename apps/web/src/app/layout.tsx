import '@/styles/globals.css';
import Header from '@/components/Header';
import { JobProvider } from '@/components/JobProvider';
import { Toaster } from 'sonner';
import { SessionProvider } from 'next-auth/react';

export const metadata = {
  title: 'SQAuto | Industrial Data Migration',
  description: 'Enterprise-grade SQL dump migration and schema mapping platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-brand-bg text-text-primary">
      <body className="min-h-screen flex flex-col font-sans transition-colors duration-500 bg-brand-bg text-text-primary">
        <SessionProvider>
          <JobProvider>
            <Header />
            <main className="flex-1 flex flex-col bg-brand-bg">
              {children}
            </main>
            <Toaster richColors closeButton position="top-right" theme="light" />
          </JobProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

