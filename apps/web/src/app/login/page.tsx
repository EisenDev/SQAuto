'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Lock, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams?.get('error');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Video autoplay failed or blocked:', err);
      });
    }
  }, []);

  useEffect(() => {
    if (urlError === 'CredentialsSignin') {
      setError('Invalid username or password.');
    } else if (urlError) {
      setError('An error occurred during authentication.');
    }
  }, [urlError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid username or password.');
        toast.error('Invalid username or password.');
      } else {
        toast.success('Successfully logged in!');
        const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard/organizations';
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-12 bg-[#f5f4ef] text-text-primary overflow-x-hidden">
      {/* Left Column - Dark (#0f1a16) */}
      <div className="hidden md:flex md:col-span-5 lg:col-span-4 bg-[#0f1a16] text-white flex-col justify-between p-8 lg:p-12 relative overflow-hidden select-none">
        
        {/* Background Loop Video Watermark */}
        <div 
          className="absolute -bottom-10 -right-10 w-80 h-80 lg:w-96 lg:h-96 pointer-events-none z-0 opacity-[0.06] overflow-hidden"
          style={{ mixBlendMode: 'screen' }}
          aria-hidden="true"
        >
          <video
            ref={videoRef}
            src="/sqauto-motiongraphics.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain scale-110"
            style={{
              filter: 'invert(100%) sepia(100%) saturate(186%) hue-rotate(120deg) brightness(0.8)'
            }}
          />
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full justify-between">
          
          {/* Logo top-left */}
          <div className="flex items-center space-x-2.5">
            <img 
              src="/sqauto.png" 
              alt="SQAuto Logo" 
              className="w-8 h-8 object-contain"
              style={{ filter: 'invert(100%)', mixBlendMode: 'screen' }}
            />
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              SQAuto
            </span>
          </div>

          {/* Headline and Features */}
          <div className="my-auto py-12 space-y-10">
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight">
              Deploy trusted <br />
              <span className="text-[#5DCAA5] italic font-serif">schema migrations</span> <br />
              to Production
            </h2>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-white/90 text-sm font-medium">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5DCAA5]/15 border border-[#5DCAA5]/30">
                  <svg className="h-3 w-3 text-[#5DCAA5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Deterministic mapping</span>
              </div>

              <div className="flex items-center space-x-3 text-white/90 text-sm font-medium">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5DCAA5]/15 border border-[#5DCAA5]/30">
                  <svg className="h-3 w-3 text-[#5DCAA5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Staging isolation</span>
              </div>

              <div className="flex items-center space-x-3 text-white/90 text-sm font-medium">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5DCAA5]/15 border border-[#5DCAA5]/30">
                  <svg className="h-3 w-3 text-[#5DCAA5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>Integrity assured</span>
              </div>
            </div>
          </div>

          {/* Copyright line bottom-left */}
          <div className="text-[11px] text-white/40 tracking-wider">
            © 2026 Zeraynce. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Column - Existing Page Background (#f5f4ef) */}
      <div className="col-span-1 md:col-span-7 lg:col-span-8 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        
        {/* Mobile Logo Header */}
        <div className="md:hidden flex items-center space-x-2 absolute top-6 left-6">
          <img src="/sqauto.png" alt="SQAuto Logo" className="w-6 h-6 object-contain" />
          <span className="text-md font-bold tracking-tight text-text-primary font-sans">
            SQAuto
          </span>
        </div>

        <div className="w-full max-w-md space-y-6 animate-in fade-in duration-500">
          
          {/* Card Container */}
          <div className="bg-white border border-brand-border rounded-3xl p-8 shadow-premium relative overflow-hidden">
            
            {/* Tab switchers */}
            <div className="flex p-1 bg-stone-100 rounded-xl mb-8 border border-brand-border/60">
              <Link 
                href="/login" 
                className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all bg-white text-brand-primary shadow-sm"
              >
                Sign in
              </Link>
              <Link 
                href="/signup" 
                className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all text-text-secondary hover:text-text-primary"
              >
                Sign up
              </Link>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-700 animate-in fade-in zoom-in duration-300">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Username field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary ml-1 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <User className="h-4.5 w-4.5 text-text-muted/60" />
                  </span>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. janesmith" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-xl text-text-primary focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] outline-none transition-all placeholder:text-text-muted/50 text-sm"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary ml-1 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-text-muted/60" />
                  </span>
                  <input 
                    required
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-xl text-text-primary focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] outline-none transition-all placeholder:text-text-muted/50 text-sm"
                  />
                </div>
              </div>

              {/* Teal Submit Button */}
              <button 
                disabled={loading || !username || !password}
                className="w-full mt-4 px-6 py-3 bg-[#1D9E75] hover:bg-[#178562] disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-[#1D9E75]/10 active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in →</span>
                )}
              </button>
            </form>

            {/* OAuth label */}
            <div className="text-center mt-6 mb-3">
              <p className="text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.3)' }}>
                OAuth providers coming soon
              </p>
            </div>

            {/* Disabled GitHub button */}
            <div className="flex justify-center">
              <button 
                disabled 
                tabIndex={-1}
                className="flex items-center justify-center space-x-2 bg-white text-text-secondary rounded-xl font-medium"
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  width: 'fit-content',
                  opacity: 0.4,
                  cursor: 'not-allowed',
                  pointerEvents: 'none',
                  border: '1px solid rgba(0,0,0,0.12)'
                }}
              >
                <svg className="h-[14px] w-[14px] text-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                GitHub — coming soon
              </button>
            </div>

            {/* Bottom link */}
            <div className="mt-8 text-center text-xs text-text-muted">
              Don't have an account?{' '}
              <Link href="/signup" className="text-brand-primary font-bold hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
