'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function WorkspaceIndex() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;

  useEffect(() => {
    if (projectId) {
      router.replace(`/workspace/${projectId}/overview`);
    }
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-10 w-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Initializing Workspace...</p>
      </div>
    </div>
  );
}
