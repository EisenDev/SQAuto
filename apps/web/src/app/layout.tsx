import '@/styles/globals.css';
import Header from '@/components/Header';
import { JobProvider } from '@/components/JobProvider';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'SQAuto | Industrial Data Migration',
  description: 'Enterprise-grade SQL dump migration and schema mapping platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className="min-h-screen flex flex-col font-sans transition-colors duration-500">
        <JobProvider>
          <Header />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Toaster richColors closeButton position="top-right" theme="dark" />
        </JobProvider>
      </body>
    </html>
  );
}

