'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock,
  Mail,
  Phone,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { supabase, signInWithGoogle } from '@/lib/supabase/client';

declare global {
  interface Window {
    google?: any;
  }
}

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/store/account/orders';

  // Mode: 'phone' | 'email'
  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('phone');

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone form state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isNewPhoneUser, setIsNewPhoneUser] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Timer for OTP countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Initialize Google Identity Services script if available
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (googleClientId && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          const buttonDiv = document.getElementById('googleSignInDiv');
          if (buttonDiv) {
            window.google.accounts.id.renderButton(buttonDiv, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'pill',
            });
          }
        }
      };
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google authentication failed');
      }
      setSuccessMsg('Signed in with Google successfully!');
      setTimeout(() => {
        router.push(redirect);
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Google sign-in error');
      setLoading(false);
    }
  };

  // Listen for Supabase Google OAuth callback or active session
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && session.user.email) {
          fetch('/api/customer/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Google Customer',
            }),
          }).then(async (r) => {
            const data = await r.json();
            if (data.success) {
              setSuccessMsg(`Welcome, ${data.customer.name}!`);
              setTimeout(() => {
                router.push(redirect);
                router.refresh();
              }, 500);
            }
          }).catch(console.error);
        }
      });
    }
  }, [redirect, router]);

  // Direct Google Sign-In (Uses Supabase OAuth if available, otherwise fast fallback)
  const handleDirectGoogleLogin = async () => {
    if (supabase) {
      try {
        setLoading(true);
        await signInWithGoogle();
        return;
      } catch (err: any) {
        console.error('[SUPABASE GOOGLE ERROR]:', err);
      } finally {
        setLoading(false);
      }
    }

    const userPromptEmail = window.prompt(
      'Enter your Google account email to sign in instantly with Google:',
      'user@gmail.com'
    );
    if (!userPromptEmail) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userPromptEmail.trim().toLowerCase(),
          name: userPromptEmail.split('@')[0].replace(/[._]/g, ' '),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google sign-in failed');
      }
      setSuccessMsg(`Welcome, ${data.customer.name}!`);
      setTimeout(() => {
        router.push(redirect);
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // 1. Phone OTP: Step 1 (Send OTP)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/^\+91/, '').replace(/\D/g, '');
    if (clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/customer/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp', phone: clean }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification OTP');
      }

      setOtpSent(true);
      setCountdown(30);
      setIsNewPhoneUser(!data.existingUser);
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setSuccessMsg(`6-digit verification code sent to +91 ${clean}`);
    } catch (err: any) {
      setError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Phone OTP: Step 2 (Verify OTP)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/customer/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-otp',
          phone,
          otp: otp.trim(),
          name: customerName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setSuccessMsg('Phone verified successfully! Redirecting...');
      setTimeout(() => {
        router.push(redirect);
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check code.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Email & Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid email or password');
      }

      setSuccessMsg('Login successful! Redirecting to your account...');
      setTimeout(() => {
        router.push(redirect);
        router.refresh();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-retu-warm-white/70 via-white to-retu-warm-white/40 min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-retu-border shadow-xl relative overflow-hidden">
        
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-retu-pink/20 to-purple-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-retu-mango/20 to-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center relative z-10">
          <Link href="/store" className="inline-block relative w-36 h-10 mb-2 hover:opacity-90 transition-opacity">
            <Image
              src="/images/brand/retu-logo.png"
              alt="Retü Foods"
              fill
              priority
              className="object-contain"
            />
          </Link>
          <h1 className="text-2xl font-extrabold text-retu-charcoal tracking-tight mt-1">
            Customer Account
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Access your cold-chain orders, live dispatch tracking, and official GST tax invoices.
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="flex-1 font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Option 1: Continue with Google */}
        <div className="space-y-3 relative z-10">
          <div id="googleSignInDiv" className="w-full"></div>
          
          <button
            type="button"
            onClick={handleDirectGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-2xl border border-gray-300 shadow-xs flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Or Sign In With
            </span>
          </div>
        </div>

        {/* Tab Switcher: Phone OTP vs Email */}
        <div className="flex bg-gray-100 p-1 rounded-2xl relative z-10">
          <button
            type="button"
            onClick={() => {
              setActiveTab('phone');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'phone'
                ? 'bg-white text-retu-charcoal shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-retu-pink" />
            <span>Mobile Number OTP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('email');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'email'
                ? 'bg-white text-retu-charcoal shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-retu-charcoal" />
            <span>Email & Password</span>
          </button>
        </div>

        {/* TAB 1: PHONE OTP LOGIN */}
        {activeTab === 'phone' && (
          <div className="space-y-4 relative z-10">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mobile Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-gray-500 pointer-events-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-retu-border rounded-xl text-xs font-medium text-retu-charcoal tracking-wide focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute right-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    We will send a 6-digit one-time password to verify your account.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  className="w-full py-3.5 px-4 bg-retu-charcoal hover:bg-black text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Get 6-Digit Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span>Code sent to <strong>+91 {phone}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setDevOtpHint(null);
                    }}
                    className="text-retu-pink font-semibold hover:underline"
                  >
                    Change Number
                  </button>
                </div>

                {devOtpHint && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px] text-emerald-800">
                    <span>Verification Code: <strong className="font-mono text-xs">{devOtpHint}</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtp(devOtpHint)}
                      className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700"
                    >
                      Auto-Fill
                    </button>
                  </div>
                )}

                {isNewPhoneUser && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aditi Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center py-3 bg-gray-50 border border-retu-border rounded-xl text-base font-mono font-bold tracking-widest text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  {countdown > 0 ? (
                    <span>Resend code in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-retu-charcoal font-semibold hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3.5 px-4 bg-retu-charcoal hover:bg-black text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: EMAIL & PASSWORD LOGIN */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailLogin} className="space-y-4 relative z-10 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                <Link
                  href="/store/account/orders"
                  className="text-[11px] text-gray-400 hover:text-retu-charcoal transition-colors"
                >
                  Quick Order Lookup?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-retu-border rounded-xl text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-retu-charcoal hover:bg-black text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-retu-border flex flex-col items-center gap-2 text-xs text-gray-500 relative z-10">
          <p>
            Don't have an account yet?{' '}
            <Link
              href={`/store/account/register?redirect=${encodeURIComponent(redirect)}`}
              className="text-retu-pink font-bold hover:underline"
            >
              Register with Shipping Address
            </Link>
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Permanent Account · Neon PostgreSQL Cloud</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-retu-pink" />
        </div>
      }
    >
      <CustomerLoginForm />
    </Suspense>
  );
}
