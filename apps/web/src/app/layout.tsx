import '@/styles/globals.css';
import Header from '@/components/Header';
import { JobProvider } from '@/components/JobProvider';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'SQAuto Dashboard',
  description: 'SQL Dump Data Migration Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full flex flex-col">
        <JobProvider>
          <Header />
          <main className="flex-1 container mx-auto p-4">
            {children}
          </main>
          <Toaster richColors closeButton position="top-right" />
        </JobProvider>
      </body>
    </html>
  );
}
