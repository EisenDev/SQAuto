'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Lock, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Video autoplay failed or blocked:', err);
      });
    }
  }, []);

  // Username validation helper
  const getUsernameValidation = (user: string) => {
    if (!user) return { valid: null, message: '3–20 characters, alphanumeric + underscores only.' };
    if (user.length < 3) return { valid: false, message: 'Too short (minimum 3 characters).' };
    if (user.length > 20) return { valid: false, message: 'Too long (maximum 20 characters).' };
    if (!/^[a-zA-Z0-9_]+$/.test(user)) return { valid: false, message: 'Only letters, numbers, or underscores allowed.' };
    return { valid: true, message: 'Username is valid.' };
  };

  const usernameValidation = getUsernameValidation(username);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', colorClass: 'bg-stone-200' };
    
    let score = 0;
    if (pass.length >= 8) score++;
    if (/\d/.test(pass)) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/[\W_]/.test(pass)) score++;
    
    if (score === 0) score = 1;
    
    let label = '';
    let colorClass = 'bg-stone-200';
    
    if (score === 1) {
      label = 'Weak';
      colorClass = 'bg-red-500';
    } else if (score === 2) {
      label = 'Fair';
      colorClass = 'bg-amber-500';
    } else if (score === 3) {
      label = 'Strong';
      colorClass = 'bg-emerald-500';
    } else if (score === 4) {
      label = 'Excellent';
      colorClass = 'bg-emerald-700';
    }
    
    return { score, label, colorClass };
  };

  const strength = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      toast.error('Passwords do not match.');
      return;
    }

    if (usernameValidation.valid === false) {
      setError('Please provide a valid username.');
      toast.error('Please provide a valid username.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Post to signup API
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const signupData = await signupRes.json().catch(() => null);

      if (!signupRes.ok) {
        const msg = signupData?.error || 'Failed to create account.';
        setError(msg);
        toast.error(msg);
        return;
      }

      // 2. Auto sign in on success
      toast.success('Account created! Logging in...');
      const loginRes = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        setError('Auto login failed. Please go to the sign in page.');
        toast.error('Auto login failed.');
      } else {
        toast.success('Successfully logged in!');
        window.location.href = '/dashboard/organizations';
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const isFormInvalid = 
    loading || 
    !username || 
    !password || 
    !confirmPassword || 
    usernameValidation.valid !== true || 
    password !== confirmPassword;

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
                className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all text-text-secondary hover:text-text-primary"
              >
                Sign in
              </Link>
              <Link 
                href="/signup" 
                className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all bg-white text-brand-primary shadow-sm"
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

            <form onSubmit={handleSignup} className="space-y-5">
              
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
                    className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-text-primary focus:ring-2 outline-none transition-all placeholder:text-text-muted/50 text-sm ${
                      usernameValidation.valid === true 
                        ? 'border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500' 
                        : usernameValidation.valid === false 
                        ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                        : 'border-brand-border focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]'
                    }`}
                  />
                </div>
                
                {/* Username live indicator text */}
                <p className={`text-[11px] font-medium ml-1 transition-colors duration-200 ${
                  usernameValidation.valid === true 
                    ? 'text-emerald-600' 
                    : usernameValidation.valid === false 
                    ? 'text-red-500' 
                    : 'text-text-muted'
                }`}>
                  {usernameValidation.message}
                </p>
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
                    placeholder="Minimum 8 characters" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-brand-border rounded-xl text-text-primary focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] outline-none transition-all placeholder:text-text-muted/50 text-sm"
                  />
                </div>
                
                {/* Password Strength segments bar */}
                <div className="space-y-1.5 mt-2 ml-1">
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${password && strength.score >= 1 ? strength.colorClass : 'bg-stone-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${password && strength.score >= 2 ? strength.colorClass : 'bg-stone-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${password && strength.score >= 3 ? strength.colorClass : 'bg-stone-200'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${password && strength.score >= 4 ? strength.colorClass : 'bg-stone-200'}`} />
                  </div>
                  {password && (
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-text-muted">
                        Strength: <strong className="font-semibold text-text-primary">{strength.label}</strong>
                      </span>
                      <span className="text-text-muted font-mono">{password.length} chars</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Password field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary ml-1 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-text-muted/60" />
                  </span>
                  <input 
                    required
                    type="password" 
                    placeholder="Re-enter password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-text-primary focus:ring-2 outline-none transition-all placeholder:text-text-muted/50 text-sm ${
                      confirmPassword 
                        ? (confirmPassword === password 
                          ? 'border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500' 
                          : 'border-red-500 focus:ring-red-500/20 focus:border-red-500')
                        : 'border-brand-border focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]'
                    }`}
                  />
                </div>
                {confirmPassword && (
                  <p className={`text-[11px] font-semibold ml-1 transition-colors duration-200 ${
                    confirmPassword === password ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {confirmPassword === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Teal Submit Button */}
              <button 
                disabled={isFormInvalid}
                className="w-full mt-6 px-6 py-3 bg-[#1D9E75] hover:bg-[#178562] disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-[#1D9E75]/10 active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Create account →</span>
                )}
              </button>
            </form>

            {/* Bottom link */}
            <div className="mt-8 text-center text-xs text-text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-primary font-bold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
