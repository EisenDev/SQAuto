'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Organization creation now happens via modal on /dashboard/organizations
export default function NewOrganizationRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/organizations');
  }, [router]);
  return null;
}
