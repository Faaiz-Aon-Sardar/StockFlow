import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Users,
  Building2,
  ShoppingCart,
  ShoppingBag,
  PackageCheck,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  X
} from 'lucide-react';
import { StaffRole } from '../../types';

export type PageId =
  | 'dashboard'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'orders'
  | 'purchases'
  | 'dispatches'
  | 'invoices'
  | 'payments'
  | 'reports'
  | 'staff'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  activeRole: StaffRole;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  lowStockCount: number;
  pendingDispatchCount: number;
}

export const navItems: {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: StaffRole[];
  badgeKey?: 'lowStock' | 'pendingDispatch';
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['owner', 'admin', 'sales', 'store', 'accounts']
  },
  {
    id: 'products',
    label: 'Products & Stock',
    icon: Boxes,
    allowedRoles: ['owner', 'admin', 'sales', 'store', 'accounts'],
    badgeKey: 'lowStock'
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    allowedRoles: ['owner', 'admin', 'sales', 'accounts']
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    icon: Building2,
    allowedRoles: ['owner', 'admin', 'store', 'accounts']
  },
  {
    id: 'orders',
    label: 'Sales Orders',
    icon: ShoppingCart,
    allowedRoles: ['owner', 'admin', 'sales', 'accounts']
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: ShoppingBag,
    allowedRoles: ['owner', 'admin', 'store', 'accounts']
  },
  {
    id: 'dispatches',
    label: 'Dispatches',
    icon: PackageCheck,
    allowedRoles: ['owner', 'admin', 'sales', 'store'],
    badgeKey: 'pendingDispatch'
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: Receipt,
    allowedRoles: ['owner', 'admin', 'sales', 'accounts']
  },
  {
    id: 'payments',
    label: 'Payments & Collections',
    icon: CreditCard,
    allowedRoles: ['owner', 'admin', 'accounts']
  },
  {
    id: 'reports',
    label: 'Reports & Export',
    icon: FileSpreadsheet,
    allowedRoles: ['owner', 'admin', 'store', 'accounts']
  },
  {
    id: 'staff',
    label: 'Staff & Roles',
    icon: ShieldCheck,
    allowedRoles: ['owner', 'admin']
  },
  {
    id: 'settings',
    label: 'Business Settings',
    icon: Settings,
    allowedRoles: ['owner', 'admin', 'accounts']
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  activeRole,
  isMobileOpen,
  onCloseMobile,
  lowStockCount,
  pendingDispatchCount
}) => {
  const visibleItems = navItems.filter((item) => item.allowedRoles.includes(activeRole));

  const roleLabels: Record<StaffRole, string> = {
    owner: 'Owner / Executive',
    admin: 'Administrator',
    sales: 'Sales Representative',
    store: 'Warehouse & Store Manager',
    accounts: 'Accountant & Billing'
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-xs">
            SF
          </div>
          <div className="leading-tight">
            <span className="font-bold text-base tracking-tight text-slate-900 block">StockFlow</span>
            <span className="text-[11px] text-slate-500 font-medium block">Wholesale & Dist.</span>
          </div>
        </div>
        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Indicator Banner */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Viewing as:</span>
          <span className="font-semibold text-blue-700 capitalize">{activeRole}</span>
        </div>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">{roleLabels[activeRole]}</p>
      </div>

      {/* Nav Link List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          let badgeVal = 0;
          if (item.badgeKey === 'lowStock') badgeVal = lowStockCount;
          if (item.badgeKey === 'pendingDispatch') badgeVal = pendingDispatchCount;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectPage(item.id);
                if (isMobileOpen) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors text-left group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {badgeVal > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-mono tabular-nums rounded border ${
                    item.badgeKey === 'lowStock'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {badgeVal}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Workspace Context Footer */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>Prototype Mode</span>
          <span className="font-mono text-emerald-600 font-medium">LocalStorage</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Antigravity IDE & Supabase RLS schema ready
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile drawer backdrop and panel */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
