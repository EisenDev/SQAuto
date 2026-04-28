'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/organizations');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Loading SQAuto Systems...</p>
      </div>
    </div>
  );
}
