/**
 * StockFlow Wholesale & Distribution Business Management System
 * Main Application Shell, Auth Gate & QueryClient Provider
 */

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, PageId, navItems } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { storage } from './services/storage';
import { StaffRole } from './types';
import { Building2, Loader2 } from 'lucide-react';

// Pages
import { Dashboard } from './pages/Dashboard';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { SalesOrdersPage } from './pages/SalesOrdersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { DispatchesPage } from './pages/DispatchesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { StaffPage } from './pages/StaffPage';
import { SettingsPage } from './pages/SettingsPage';
import { BusinessOnboarding } from './components/auth/BusinessOnboarding';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function AppShell() {
  const { isAuthenticated, isLoading, currentRole, setRolePerspective, currentBusiness } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [, setDataVersion] = useState(0);

  // Subscribe to storage changes for reactivity in mock mode
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Compute live badges
  const products = storage.getProducts();
  const orders = storage.getOrders();
  const lowStockCount = products.filter((p) => p.currentStock <= p.reorderLevel).length;
  const pendingDispatchCount = orders.filter((o) => o.status === 'confirmed').length;

  const handleRoleChange = (newRole: StaffRole) => {
    setRolePerspective(newRole);
    storage.setActiveRole(newRole);

    // If active page is restricted in new role, redirect safely to dashboard
    const currentNavItem = navItems.find((item) => item.id === currentPage);
    if (currentNavItem && !currentNavItem.allowedRoles.includes(newRole)) {
      setCurrentPage('dashboard');
    }
  };

  const handleResetData = () => {
    storage.resetToDefaults();
    setCurrentPage('dashboard');
  };

  // 1. Loading Splash Screen
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tight text-white">Stock<span className="text-indigo-400">Flow</span></span>
            <span className="block text-xs uppercase tracking-wider text-slate-400 font-medium">Wholesale & Distribution</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Authenticating session & loading business tenant...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Protected Route Gate
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 3. New User Onboarding Gate
  if (!currentBusiness) {
    return <BusinessOnboarding />;
  }

  // 4. Authenticated Application Shell
  const renderActivePage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'products':
        return <ProductsPage />;
      case 'customers':
        return <CustomersPage onNavigate={setCurrentPage} />;
      case 'suppliers':
        return <SuppliersPage onNavigate={setCurrentPage} />;
      case 'orders':
        return <SalesOrdersPage onNavigate={setCurrentPage} />;
      case 'purchases':
        return <PurchasesPage />;
      case 'dispatches':
        return <DispatchesPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'staff':
        return <StaffPage activeRole={currentRole} onChangeRole={handleRoleChange} />;
      case 'settings':
        return <SettingsPage onResetData={handleResetData} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        activeRole={currentRole}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        lowStockCount={lowStockCount}
        pendingDispatchCount={pendingDispatchCount}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Header
          currentPage={currentPage}
          activeRole={currentRole}
          onChangeRole={handleRoleChange}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          onResetData={handleResetData}
        />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {renderActivePage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}
