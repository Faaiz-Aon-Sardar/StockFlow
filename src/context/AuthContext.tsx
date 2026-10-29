/**
 * StockFlow Authentication & Multi-Tenant Business Context
 * 
 * Manages Supabase Auth session, user profile, business memberships,
 * active business context, and role-aware navigation.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { DbProfile, DbBusiness, DbBusinessMember, UserRole } from '../types/database';
import { storage } from '../services/storage';

interface AuthContextType {
  user: User | null;
  profile: DbProfile | null;
  memberships: DbBusinessMember[];
  currentBusiness: DbBusiness | null;
  currentRole: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  isConfigured: boolean;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  createBusiness: (name: string, legalName?: string, gstin?: string) => Promise<any>;
  switchBusiness: (businessId: string) => void;
  setRolePerspective: (role: UserRole) => void;
  enableDevMockSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Demo Business for Mock / Dev Preview Mode
const DEMO_BUSINESS: DbBusiness = {
  id: 'biz-001',
  name: 'StockFlow Dist. Agencies Pvt. Ltd.',
  trade_name: 'StockFlow Wholesale Hub',
  gstin: '27AABCS1429B1Z8',
  pan_number: 'AABCS1429B',
  email: 'operations@stockflowhub.com',
  phone: '+91 98200 45678',
  website: 'https://stockflowhub.com',
  address: 'Plot 42, Sector 18, Vashi APMC Grain Market, Navi Mumbai, Maharashtra 400703',
  state: 'Maharashtra',
  state_code: '27',
  currency_code: 'INR',
  currency_symbol: '₹',
  default_payment_terms: 'net_15',
  invoice_prefix: 'INV-2026-',
  order_prefix: 'SO-',
  purchase_prefix: 'PO-',
  dispatch_prefix: 'DSP-',
  payment_prefix: 'RCP-',
  valuation_method: 'fifo',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [memberships, setMemberships] = useState<DbBusinessMember[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<DbBusiness | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const configured = isSupabaseConfigured();

  // Load user profile and business memberships upon auth state change
  const loadUserData = async (authUser: User) => {
    try {
      setAuthError(null);

      // 1. Fetch user profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profErr) {
        console.warn('Profile fetch warning (creating temporary profile):', profErr.message);
        setProfile({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        setProfile(prof);
      }

      // 2. Fetch business memberships
      const { data: mems, error: memsErr } = await supabase
        .from('business_members')
        .select(`
          *,
          business:businesses(*)
        `)
        .eq('user_id', authUser.id)
        .eq('is_active', true);

      if (memsErr) throw memsErr;

      if (mems && mems.length > 0) {
        setMemberships(mems);
        const firstMem = mems[0];
        setCurrentBusiness(firstMem.business || null);
        setCurrentRole(firstMem.role);
      } else {
        // User has no business membership yet
        setMemberships([]);
        setCurrentBusiness(null);
      }
    } catch (err: any) {
      console.error('Error loading business memberships:', err);
      setAuthError(err.message || 'Failed to load business membership details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!configured) {
      // Check if local dev mock session was saved
      const savedMock = localStorage.getItem('stockflow_mock_auth');
      if (savedMock === 'true') {
        enableDevMockSession();
      } else {
        setIsLoading(false);
      }
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setMemberships([]);
        setCurrentBusiness(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);

    if (!configured) {
      // If Supabase is not configured, inform the user or provide mock login
      throw new Error('Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured. You can use Dev Mock Mode for preview.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setIsLoading(false);
      setAuthError(error.message);
      throw error;
    }

    if (data.user) {
      setUser(data.user);
      await loadUserData(data.user);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    setAuthError(null);

    if (!configured) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      setIsLoading(false);
      setAuthError(error.message);
      throw error;
    }

    if (data.user) {
      setUser(data.user);
      await loadUserData(data.user);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    localStorage.removeItem('stockflow_mock_auth');
    setIsMock(false);

    if (configured) {
      await supabase.auth.signOut();
    }

    setUser(null);
    setProfile(null);
    setMemberships([]);
    setCurrentBusiness(null);
    setCurrentRole('owner');
    setIsLoading(false);
  };

  const switchBusiness = (businessId: string) => {
    const target = memberships.find((m) => m.business_id === businessId);
    if (target && target.business) {
      setCurrentBusiness(target.business);
      setCurrentRole(target.role);
    }
  };

  const setRolePerspective = (role: UserRole) => {
    setCurrentRole(role);
  };

  const createBusiness = async (name: string, legalName?: string, gstin?: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.rpc('create_business_with_owner', {
        p_name: name,
        p_legal_name: legalName || null,
        p_gstin: gstin || null,
        p_currency: 'INR'
      });

      if (error) throw error;

      if (user) {
        await loadUserData(user);
      }
      return data;
    } catch (err: any) {
      setAuthError(err.message || 'Failed to create business.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const enableDevMockSession = () => {
    setIsMock(true);
    localStorage.setItem('stockflow_mock_auth', 'true');
    setUser({
      id: 'mock-user-001',
      email: 'owner@stockflowhub.com',
      app_metadata: {},
      user_metadata: { full_name: 'Rajesh Sharma' },
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User);

    setProfile({
      id: 'mock-user-001',
      email: 'owner@stockflowhub.com',
      full_name: 'Rajesh Sharma',
      phone: '+91 98200 45678',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setCurrentBusiness(DEMO_BUSINESS);
    setCurrentRole(storage.getActiveRole() as UserRole);
    setMemberships([
      {
        id: 'mock-mem-001',
        business_id: DEMO_BUSINESS.id,
        user_id: 'mock-user-001',
        role: 'owner',
        department: 'Executive Management',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        business: DEMO_BUSINESS
      }
    ]);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        memberships,
        currentBusiness,
        currentRole,
        isLoading,
        isAuthenticated: !!user,
        authError,
        isConfigured: configured,
        isMock,
        signIn,
        signOut,
        signUp,
        createBusiness,
        switchBusiness,
        setRolePerspective,
        enableDevMockSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
