import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, ArrowRight, ShieldCheck, LogOut, Loader2, AlertCircle } from 'lucide-react';

export const BusinessOnboarding: React.FC = () => {
  const { createBusiness, signOut, user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setErrorMsg('Please enter your business trading name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createBusiness(businessName.trim(), legalName.trim() || undefined, gstin.trim() || undefined);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize business workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 font-sans">
      <div className="w-full max-w-lg bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Setup Your Wholesale Enterprise</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Welcome, <strong>{user?.user_metadata?.full_name || user?.email}</strong>. Create your business workspace to begin managing inventory, dispatches, and tax invoices.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Trading / Business Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Shree Balaji Wholesale Traders"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Legal Entity Name (Optional)
            </label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Shree Balaji Distribution Agencies Pvt. Ltd."
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 27AABCS1429B1Z8"
              maxLength={15}
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 font-mono uppercase focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !businessName.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring Workspace...</span>
                </>
              ) : (
                <>
                  <span>Initialize & Open StockFlow</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer & Sign out */}
        <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Multi-Tenant RLS Protected</span>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center space-x-1 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
