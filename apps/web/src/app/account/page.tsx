'use client';

import React from 'react';
import Link from 'next/link';

export default function AccountPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f5f4ef]">
      <div className="bg-white border border-brand-border rounded-3xl p-8 max-w-md w-full shadow-premium text-center space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Account Settings</h1>
        <p className="text-sm text-text-secondary">
          This is a placeholder page for managing your profile, passwords, and preferences.
        </p>
        <div className="pt-4">
          <Link 
            href="/dashboard/organizations"
            className="inline-flex items-center px-4 py-2 border border-brand-border rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary bg-stone-50 hover:bg-stone-100 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
