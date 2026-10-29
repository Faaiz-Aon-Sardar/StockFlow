import React, { useState } from 'react';
import { Menu, RotateCcw, User, Shield, Check, LogOut, Building2, ChevronDown } from 'lucide-react';
import { StaffRole } from '../../types';
import { PageId } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  currentPage: PageId;
  activeRole: StaffRole;
  onChangeRole: (role: StaffRole) => void;
  onOpenMobileSidebar: () => void;
  onResetData: () => void;
}

const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Operations Dashboard',
    subtitle: 'Daily wholesale KPIs, cash collections, and inventory valuation'
  },
  products: {
    title: 'Products & Inventory',
    subtitle: 'Manage catalog, wholesale pricing tiers, HSN/GST, and stock ledger'
  },
  customers: {
    title: 'Customer Directory',
    subtitle: 'Retail stores, credit limits, GSTINs, and ledger balances'
  },
  suppliers: {
    title: 'Supplier Directory',
    subtitle: 'FMCG manufacturers, clearing agents, and accounts payable'
  },
  orders: {
    title: 'Sales Orders',
    subtitle: 'Multi-item wholesale bookings, stock reservations, and dispatching'
  },
  purchases: {
    title: 'Purchases & Inward Receipts',
    subtitle: 'Vendor purchase orders and verified physical stock receipts'
  },
  dispatches: {
    title: 'Warehouse Dispatches',
    subtitle: 'Fulfillment queue, delivery vehicle logging, and stock deduction'
  },
  invoices: {
    title: 'Tax Invoices',
    subtitle: 'GST-compliant tax invoices, printable PDF templates, and credit notes'
  },
  payments: {
    title: 'Payments & Collections',
    subtitle: 'Record bank/UPI/cash collections and multi-invoice payment allocation'
  },
  reports: {
    title: 'Reports & Spreadsheet Portability',
    subtitle: 'Financial analytics, CSV export, and spreadsheet import validation'
  },
  staff: {
    title: 'Staff & Role-Based Permissions',
    subtitle: 'Role boundaries and access control preview for Supabase Auth'
  },
  settings: {
    title: 'Business Settings',
    subtitle: 'Company profile, GSTIN configuration, and bank account remittance'
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  activeRole,
  onChangeRole,
  onOpenMobileSidebar,
  onResetData
}) => {
  const { user, profile, currentBusiness, memberships, switchBusiness, signOut, isMock } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBusinessMenu, setShowBusinessMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const roles: { id: StaffRole; label: string; desc: string }[] = [
    { id: 'owner', label: 'Owner / Admin', desc: 'Full access to all operations & financials' },
    { id: 'sales', label: 'Sales Staff', desc: 'Orders, customers, and dispatches' },
    { id: 'store', label: 'Store Staff', desc: 'Warehouse receipts, inventory, and dispatch logs' },
    { id: 'accounts', label: 'Accounts Staff', desc: 'Invoices, payment allocations, and tax reports' }
  ];

  const currentInfo = pageTitles[currentPage] || pageTitles.dashboard;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Staff Member';

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              <span className="font-medium text-slate-700">StockFlow</span>
              <span aria-hidden="true">/</span>
              <span className="capitalize">{currentPage}</span>
              {isMock && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Dev Mock Mode
                </span>
              )}
            </div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
              {currentInfo.title}
            </h1>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multi-Tenant Business Switcher */}
          {memberships.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowBusinessMenu(!showBusinessMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline truncate max-w-[120px]">{currentBusiness?.name || 'Select Business'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showBusinessMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowBusinessMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-30">
                    <div className="px-3 py-1 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Business</p>
                    </div>
                    {memberships.map((m) => (
                      <button
                        key={m.business_id}
                        onClick={() => {
                          switchBusiness(m.business_id);
                          setShowBusinessMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <span className={`font-medium truncate ${m.business_id === currentBusiness?.id ? 'text-indigo-600 font-bold' : 'text-slate-800'}`}>
                          {m.business?.name}
                        </span>
                        {m.business_id === currentBusiness?.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reset Demo Data Button (in mock mode) */}
          {isMock && (
            <button
              onClick={() => setShowResetConfirm(true)}
              title="Reset data to factory sample defaults"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          )}

          {/* Role Perspective Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-xs transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span className="capitalize font-semibold">{activeRole}</span>
              <span className="text-[10px] text-slate-400 hidden md:inline">▾</span>
            </button>

            {showRoleMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowRoleMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-30">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400">Role Perspective</p>
                    <p className="text-[10px] text-slate-500">
                      Simulates UI accessibility across team boundaries
                    </p>
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onChangeRole(r.id);
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-start justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <span
                          className={`font-medium block ${
                            activeRole === r.id ? 'text-blue-600 font-semibold' : 'text-slate-800'
                          }`}
                        >
                          {r.label}
                        </span>
                        <span className="text-[10px] text-slate-500 leading-tight block">
                          {r.desc}
                        </span>
                      </div>
                      {activeRole === r.id && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* User Profile Avatar & Sign Out */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <span className="font-semibold text-slate-900 block truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-500 block capitalize">{activeRole}</span>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-30">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setShowResetConfirm(false)}
          />
          <div className="relative bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-slate-200 z-10 text-left">
            <h3 className="text-sm font-bold text-slate-900">Reset Demo Data to Factory Defaults?</h3>
            <p className="text-xs text-slate-600 mt-2">
              This will re-initialize all products, orders, stock movements, and invoices to the
              initial FMCG wholesale sample dataset. Any changes made during this session will be
              reset.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Yes, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
