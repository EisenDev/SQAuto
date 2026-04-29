"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import SqlUploadCard from '@/components/SqlUploadCard';
import { ArrowLeft } from 'lucide-react';

export default function SqlUploadPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full space-y-12 animate-in fade-in duration-500">
      {/* Main Upload Card */}
      <div className="flex justify-center pt-8">
        <SqlUploadCard 
          projectId={projectId} 
          onSuccess={(job) => {
            // After successful initiation, we wait a moment or just redirect to the results page
            // which will show the "restoring" status
            setTimeout(() => {
              router.push(`/dashboard/project/${projectId}/sql`);
            }, 1500);
          }}
        />
      </div>
    </div>
  );
}
