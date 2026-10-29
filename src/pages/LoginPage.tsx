/**
 * StockFlow Authentication Portal
 * High-performance, branded login & registration container with Supabase Auth integration.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Database,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

export function LoginPage() {
  const { signIn, signUp, authError, isConfigured, enableDevMockSession, isLoading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (isRegistering) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full legal name.');
        }
        await signUp(email.trim(), password, fullName.trim());
        setSignupSuccess(true);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      setFormError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-slate-900 text-slate-100 font-sans">
      {/* Left Branding & Highlights Hero */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-12 flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-white">Stock<span className="text-indigo-400">Flow</span></span>
              <span className="block text-xs uppercase tracking-wider text-slate-400 font-medium">Wholesale & Distribution</span>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-sm mt-3">
            Enterprise inventory, GST tax invoicing, multi-order dispatches, and double-entry payment reconciliation.
          </p>
        </div>

        {/* Value Highlights */}
        <div className="relative z-10 space-y-4 my-8">
          <div className="flex items-start space-x-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">PostgreSQL Row Level Security</h4>
              <p className="text-xs text-slate-400 mt-0.5">Strict multi-tenant boundaries ensure zero cross-business data leaks.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <Database className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Immutable Inventory Ledgers</h4>
              <p className="text-xs text-slate-400 mt-0.5">FIFO valuation, goods receipts, and confirmed dispatch fulfillment.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">GST Compliance Engine</h4>
              <p className="text-xs text-slate-400 mt-0.5">Sequential serial numbering, CGST/SGST/IGST breakdown, and e-Waybill readiness.</p>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 pt-4">
          <span>Engineered for Indian Wholesale Agencies</span>
          <span>v1.0.0 (Supabase Core)</span>
        </div>
      </div>

      {/* Right Form Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isRegistering ? 'Create your account' : 'Sign in to StockFlow'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {isRegistering
                ? 'Join your wholesale agency or set up a new business profile'
                : 'Enter your credentials to access inventory, orders, and ledger'}
            </p>
          </div>

          {/* Supabase Status Banner */}
          {!isConfigured && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300 space-y-2">
              <div className="flex items-center space-x-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Supabase Credentials Not Yet Configured</span>
              </div>
              <p className="text-amber-200/80 leading-relaxed">
                Add <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200">VITE_SUPABASE_URL</code> and <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200">VITE_SUPABASE_ANON_KEY</code> to your <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200">.env.local</code> to connect live PostgreSQL.
              </p>
              <button
                type="button"
                onClick={enableDevMockSession}
                className="w-full mt-2 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>Launch Offline Dev Preview (Mock Data)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {(formError || authError) && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-xl flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{formError || authError}</span>
            </div>
          )}

          {/* Signup Success Notice */}
          {signupSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3.5 rounded-xl flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Account created successfully!</p>
                <p className="mt-0.5 text-emerald-300/80">Please check your email for verification if email confirmation is enabled on your Supabase project.</p>
              </div>
            </div>
          )}

          {/* Quick Demo Access Card */}
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 text-xs text-indigo-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo Account
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">Owner</span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2.5">
              Pre-loaded with inventory, customers, suppliers & double-entry ledger. Zero verification emails required.
            </p>
            <button
              type="button"
              onClick={() => {
                setEmail('demo.stockflow@gmail.com');
                setPassword('Demo@123456');
                setIsRegistering(false);
                setFormError(null);
              }}
              className="w-full py-1.5 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-100 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Auto-fill Demo Credentials</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Legal Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Business Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@stockflowhub.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                {!isRegistering && (
                  <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isRegistering ? 'Complete Registration' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setFormError(null);
                setSignupSuccess(false);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              {isRegistering
                ? 'Already have an active account? Sign In'
                : 'First time here? Create staff or owner account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
