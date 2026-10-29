import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  Boxes,
  Users,
  Building2,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { formatINR } from '../services/storage';
import {
  generateComprehensiveReport,
  getDateRangePreset,
  type DateFilterRange,
} from '../services/reportsEngine';
import {
  exportProducts,
  exportParties,
  exportSalesOrders,
  exportInvoices,
  exportPayments,
  exportPurchases,
  exportStockMovements,
  exportSalesAndCollectionsReport,
  type ExportFormat,
} from '../services/exportService';
import { ImportWizardModal } from '../components/import/ImportWizardModal';
import type { ImportRecordType } from '../services/importService';

export const ReportsPage: React.FC = () => {
  const { currentBusiness } = useAuth();
  const businessId = currentBusiness?.id || 'biz-default';

  // Navigation & View Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'product_sales' | 'customer_balances' | 'supplier_balances' | 'stock_movements'
  >('overview');

  // Date Filter State
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Export Settings
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Import Wizard Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRecordType, setImportRecordType] = useState<ImportRecordType>('products');

  // Queries for business domain records
  const { data: dbProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', businessId],
    queryFn: () => api.getProducts(businessId),
    enabled: !!businessId,
  });

  const { data: dbParties = [], isLoading: loadingParties } = useQuery({
    queryKey: ['parties', businessId],
    queryFn: () => api.getParties(businessId),
    enabled: !!businessId,
  });

  const { data: dbOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders', businessId],
    queryFn: () => api.getOrders(businessId),
    enabled: !!businessId,
  });

  const { data: dbInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', businessId],
    queryFn: () => api.getInvoices(businessId),
    enabled: !!businessId,
  });

  const { data: dbPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', businessId],
    queryFn: () => api.getPayments(businessId),
    enabled: !!businessId,
  });

  const { data: dbPurchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ['purchases', businessId],
    queryFn: () => api.getPurchases(businessId),
    enabled: !!businessId,
  });

  const { data: dbStockMovements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ['stockMovements', businessId],
    queryFn: () => api.getStockMovements(businessId),
    enabled: !!businessId,
  });

  const isLoading =
    loadingProducts ||
    loadingParties ||
    loadingOrders ||
    loadingInvoices ||
    loadingPayments ||
    loadingPurchases ||
    loadingMovements;

  // Derive normalized models for reports & exports
  const normalizedProducts = useMemo(() => {
    return dbProducts.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.uom,
      selling_price: p.default_selling_price,
      purchase_price: p.purchase_cost,
      current_stock: p.current_stock,
      min_stock_level: p.reorder_level,
      hsn_code: p.hsn_code,
      tax_rate: p.gst_rate,
      created_at: p.created_at,
    }));
  }, [dbProducts]);

  const normalizedParties = useMemo(() => {
    return dbParties.map((pt) => ({
      id: pt.id,
      name: pt.name,
      code: pt.code,
      type: pt.party_type as any,
      phone: pt.phone,
      email: pt.email,
      gstin: pt.gstin,
      credit_limit: pt.credit_limit,
      outstanding_balance: pt.current_outstanding,
      created_at: pt.created_at,
    }));
  }, [dbParties]);

  const normalizedOrders = useMemo(() => {
    return dbOrders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      customer_id: o.customer_id,
      customer_name: (o as any).customer?.name || 'Customer',
      order_date: o.order_date,
      grand_total: o.grand_total,
      status: o.status,
      payment_status: o.payment_status,
      created_at: o.created_at,
      items: (o.items || []).map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.line_total,
      })),
    }));
  }, [dbOrders]);

  const normalizedInvoices = useMemo(() => {
    return dbInvoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      customer_id: inv.customer_id,
      customer_name: (inv as any).customer?.name || 'Customer',
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      total_amount: inv.grand_total,
      amount_paid: inv.total_paid,
      balance_due: inv.balance_due,
      status: inv.status,
      created_at: inv.created_at,
    }));
  }, [dbInvoices]);

  const normalizedPayments = useMemo(() => {
    return dbPayments.map((p) => ({
      id: p.id,
      payment_number: p.payment_number,
      payment_date: p.payment_date,
      party_type: p.party_type,
      party_id: p.party_id,
      party_name: (p as any).party?.name || 'Party',
      amount: p.amount,
      payment_method: p.payment_method,
      reference_no: p.reference_no,
      created_at: p.created_at,
      allocations: (p as any).allocations || [],
    }));
  }, [dbPayments]);

  const normalizedPurchases = useMemo(() => {
    return dbPurchases.map((po) => ({
      id: po.id,
      po_number: po.purchase_ref,
      supplier_id: po.supplier_id,
      supplier_name: (po as any).supplier?.name || 'Supplier',
      grand_total: po.grand_total,
      paid_amount: 0,
      status: po.status,
      payment_status: po.payment_status,
      created_at: po.created_at,
    }));
  }, [dbPurchases]);

  const normalizedStockMovements = useMemo(() => {
    return dbStockMovements.map((sm) => ({
      id: sm.id,
      product_id: sm.product_id,
      movement_type: sm.movement_type,
      quantity: Math.abs(sm.change_qty),
      reference_type: 'transaction',
      created_at: sm.created_at,
    }));
  }, [dbStockMovements]);

  // Current active date range object
  const activeDateRange: DateFilterRange = useMemo(() => {
    if (datePreset === 'custom') {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        preset: 'custom',
      };
    }
    return getDateRangePreset(datePreset);
  }, [datePreset, customStartDate, customEndDate]);

  // Generate verified report metrics
  const report = useMemo(() => {
    return generateComprehensiveReport({
      dateRange: activeDateRange,
      products: normalizedProducts as any,
      parties: normalizedParties as any,
      orders: normalizedOrders as any,
      invoices: normalizedInvoices as any,
      payments: normalizedPayments as any,
      purchases: normalizedPurchases as any,
      stockMovements: normalizedStockMovements as any,
      costingMethod: 'fifo',
    });
  }, [
    activeDateRange,
    normalizedProducts,
    normalizedParties,
    normalizedOrders,
    normalizedInvoices,
    normalizedPayments,
    normalizedPurchases,
    normalizedStockMovements,
  ]);

  // Trigger export handlers
  const handleExport = (type: string) => {
    setIsExportMenuOpen(false);
    switch (type) {
      case 'products':
        exportProducts(normalizedProducts as any, exportFormat);
        break;
      case 'customers':
        exportParties(
          normalizedParties.filter((p) => p.type === 'customer' || p.type === 'both') as any,
          'customers',
          exportFormat
        );
        break;
      case 'suppliers':
        exportParties(
          normalizedParties.filter((p) => p.type === 'supplier' || p.type === 'both') as any,
          'suppliers',
          exportFormat
        );
        break;
      case 'orders':
        exportSalesOrders(normalizedOrders as any, exportFormat);
        break;
      case 'invoices':
        exportInvoices(normalizedInvoices as any, exportFormat);
        break;
      case 'payments':
        exportPayments(normalizedPayments as any, exportFormat);
        break;
      case 'purchases':
        exportPurchases(normalizedPurchases as any, exportFormat);
        break;
      case 'movements':
        exportStockMovements(normalizedStockMovements as any, normalizedProducts as any, exportFormat);
        break;
      case 'comprehensive':
        exportSalesAndCollectionsReport({
          invoices: normalizedInvoices as any,
          payments: normalizedPayments as any,
          dateRange: activeDateRange,
          format: exportFormat,
        });
        break;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Control Strip */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Reliable Financial & Operational Reports
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live metrics computed from authorized Supabase transactions. Zero duplicate business data.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Format Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  exportFormat === 'xlsx'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                XLSX
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  exportFormat === 'csv'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                CSV
              </button>
            </div>

            {/* Import Data Wizard Trigger */}
            <button
              type="button"
              onClick={() => {
                setImportRecordType('products');
                setIsImportModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import Data Wizard</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export ({exportFormat.toUpperCase()})</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-2 divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                  <div className="px-3 py-1.5 font-bold text-slate-400 uppercase text-[10px]">
                    Comprehensive Reports
                  </div>
                  <button
                    onClick={() => handleExport('comprehensive')}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                  >
                    Sales & Collections Report (Date-Filtered)
                  </button>

                  <div className="px-3 py-1.5 font-bold text-slate-400 uppercase text-[10px] mt-1">
                    Master & Ledger Exports
                  </div>
                  <button
                    onClick={() => handleExport('products')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Products & Stock Balances
                  </button>
                  <button
                    onClick={() => handleExport('customers')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Customers & Receivables
                  </button>
                  <button
                    onClick={() => handleExport('suppliers')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Suppliers & Payables
                  </button>
                  <button
                    onClick={() => handleExport('orders')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Sales Orders Register
                  </button>
                  <button
                    onClick={() => handleExport('invoices')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Issued Invoices & Balances
                  </button>
                  <button
                    onClick={() => handleExport('payments')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Payments & Allocations
                  </button>
                  <button
                    onClick={() => handleExport('purchases')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Purchase Orders
                  </button>
                  <button
                    onClick={() => handleExport('movements')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Stock Movements Ledger
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold mr-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Timeframe:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'this_quarter', label: 'This Quarter' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  datePreset === p.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center space-x-2 pl-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200"
                placeholder="Start Date"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200"
                placeholder="End Date"
              />
            </div>
          )}

          <div className="ml-auto text-xs text-slate-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {activeDateRange.startDate && activeDateRange.endDate
                ? `${activeDateRange.startDate} → ${activeDateRange.endDate}`
                : 'Showing complete database history'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Financial Overview Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Invoiced Sales</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {formatINR(report.summary.invoicedTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{report.summary.invoicedCount} invoices issued</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Sales Orders</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {formatINR(report.summary.orderTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{report.summary.orderCount} orders booked</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Collected Funds</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">
            {formatINR(report.summary.collectionsTotal)}
          </p>
          <p className="text-[11px] text-emerald-700/70 mt-0.5">Realized cash / bank</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Outstanding Receivables</p>
          <p className="text-lg font-bold text-rose-600 mt-1">
            {formatINR(report.summary.receivablesDue)}
          </p>
          <p className="text-[11px] text-rose-500/80 mt-0.5">
            Overdue: {formatINR(report.summary.overdueReceivables)}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Supplier Payables</p>
          <p className="text-lg font-bold text-amber-600 mt-1">
            {formatINR(report.summary.payablesDue)}
          </p>
          <p className="text-[11px] text-amber-700/70 mt-0.5">Purchases: {formatINR(report.summary.purchasesTotal)}</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[9px] font-bold rounded">
            FIFO
          </div>
          <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">Gross Profit</p>
          <p className="text-lg font-bold text-blue-600 mt-1">
            {formatINR(report.summary.grossProfit)}
          </p>
          <p className="text-[11px] text-blue-500 mt-0.5">Margin: {report.summary.grossProfitMargin}%</p>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Executive Summary
        </button>
        <button
          onClick={() => setActiveTab('product_sales')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'product_sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Product-Wise Sales & Margin
        </button>
        <button
          onClick={() => setActiveTab('customer_balances')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'customer_balances'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Customer Balances & Limits
        </button>
        <button
          onClick={() => setActiveTab('supplier_balances')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'supplier_balances'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Supplier Balances & Payables
        </button>
        <button
          onClick={() => setActiveTab('stock_movements')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'stock_movements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Stock Ledger & Valuation
        </button>
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Profit & Revenue Attribution</span>
              </h3>
              <p className="text-xs text-slate-500">
                Calculated strictly from delivered order items with established purchase costs.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Costing Method</span>
                  <span className="font-semibold text-blue-600 uppercase">{report.costingMethod} Valuation</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Total Booked Order Value</span>
                  <span className="font-semibold">{formatINR(report.summary.orderTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Total Invoiced (Tax Invoices)</span>
                  <span className="font-semibold">{formatINR(report.summary.invoicedTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Collections (Cash/Bank)</span>
                  <span className="font-semibold text-emerald-600">{formatINR(report.summary.collectionsTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/50">
                  <span className="text-blue-900 dark:text-blue-300 font-semibold">Net Gross Margin</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">
                    {formatINR(report.summary.grossProfit)} ({report.summary.grossProfitMargin}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Asset & Working Capital State</span>
              </h3>
              <p className="text-xs text-slate-500">
                Current inventory valuation and credit exposure across distributors.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Current Warehouse Stock Asset Value</span>
                  <span className="font-semibold">{formatINR(report.summary.currentInventoryValue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Total Customer Receivables</span>
                  <span className="font-semibold text-rose-600">{formatINR(report.summary.receivablesDue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Overdue Invoices Past Grace Period</span>
                  <span className="font-semibold text-rose-600">{formatINR(report.summary.overdueReceivables)}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-slate-600 dark:text-slate-400">Supplier Payables Balance</span>
                  <span className="font-semibold text-amber-600">{formatINR(report.summary.payablesDue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Product-Wise Sales */}
      {activeTab === 'product_sales' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Product-Wise Sales & Gross Profit</h3>
              <p className="text-xs text-slate-500">
                Sorted by highest gross sales in the selected period. Profit calculated using FIFO purchase costs.
              </p>
            </div>
            <button
              onClick={() => handleExport('products')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Product Catalog</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Qty Sold</th>
                  <th className="px-4 py-3 text-right">Gross Sales</th>
                  <th className="px-4 py-3 text-right">COGS (Cost)</th>
                  <th className="px-4 py-3 text-right">Gross Profit</th>
                  <th className="px-4 py-3 text-right">Margin %</th>
                  <th className="px-4 py-3 text-right">Physical Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.productSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No product sales recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  report.productSales.map((ps) => (
                    <tr key={ps.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">{ps.sku}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{ps.productName}</td>
                      <td className="px-4 py-3 text-slate-500">{ps.category}</td>
                      <td className="px-4 py-3 text-right font-semibold">{ps.quantitySold}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatINR(ps.grossSales)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatINR(ps.totalCost)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {formatINR(ps.grossProfit)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600">
                        {ps.profitMarginPercent}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {ps.currentStock}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Customer Balances & Limits */}
      {activeTab === 'customer_balances' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customer Receivables & Aging Balances</h3>
              <p className="text-xs text-slate-500">
                Track invoice balances, credit limit compliance, and collection totals.
              </p>
            </div>
            <button
              onClick={() => handleExport('customers')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Customer Ledger</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Orders In Range</th>
                  <th className="px-4 py-3 text-right">Invoiced Total</th>
                  <th className="px-4 py-3 text-right">Amount Collected</th>
                  <th className="px-4 py-3 text-right">Outstanding Balance</th>
                  <th className="px-4 py-3 text-right">Credit Limit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.customerSales.map((cust) => (
                  <tr key={cust.customerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">{cust.customerCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{cust.customerName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{cust.phone || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{cust.totalOrders}</td>
                    <td className="px-4 py-3 text-right">{formatINR(cust.invoicedTotal)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {formatINR(cust.amountCollected)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      {formatINR(cust.outstandingBalance)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {cust.creditLimit > 0 ? formatINR(cust.creditLimit) : 'No Limit'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cust.isOverLimit ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          Over Limit
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Supplier Balances */}
      {activeTab === 'supplier_balances' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Supplier Accounts & Outstanding Payables</h3>
              <p className="text-xs text-slate-500">
                Track procurement purchases, payments released, and liabilities due.
              </p>
            </div>
            <button
              onClick={() => handleExport('suppliers')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Supplier Register</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Supplier Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Total Purchased</th>
                  <th className="px-4 py-3 text-right">Total Paid</th>
                  <th className="px-4 py-3 text-right">Outstanding Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.supplierBalances.map((supp) => (
                  <tr key={supp.supplierId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">{supp.supplierCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{supp.supplierName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{supp.phone || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(supp.totalPurchased)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {formatINR(supp.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">
                      {formatINR(supp.outstandingPayable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Stock Ledger & Movements */}
      {activeTab === 'stock_movements' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stock Movement Ledger Summaries</h3>
              <p className="text-xs text-slate-500">
                Audited transaction totals across dispatches, purchase receipts, and inventory adjustments.
              </p>
            </div>
            <button
              onClick={() => handleExport('movements')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Stock Audit Logs</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3 text-right">Transactions Count</th>
                  <th className="px-4 py-3 text-right">Total Units</th>
                  <th className="px-4 py-3 text-right">Estimated Value (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No stock movements recorded in this period.
                    </td>
                  </tr>
                ) : (
                  report.stockMovements.map((sm) => (
                    <tr key={sm.movementType} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold capitalize text-slate-800 dark:text-slate-200">
                        {sm.movementType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{sm.transactionCount}</td>
                      <td className="px-4 py-3 text-right font-bold">{sm.totalQuantity}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">
                        {formatINR(sm.estimatedValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultRecordType={importRecordType}
      />
    </div>
  );
};
