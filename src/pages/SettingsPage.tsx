import React, { useState } from 'react';
import {
  Settings,
  Building,
  CreditCard,
  Sliders,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  Save,
  ShieldAlert,
  Info
} from 'lucide-react';
import { BusinessSettings, PaymentTerms } from '../types';
import { storage } from '../services/storage';

interface SettingsPageProps {
  onResetData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onResetData }) => {
  const [settings, setSettings] = useState<BusinessSettings>(storage.getSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        storage.restoreBackup(parsed);
        setSettings(storage.getSettings());
        setImportStatus('Backup restored successfully!');
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err: any) {
        alert('Failed to parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleChange = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      products: storage.getProducts(),
      customers: storage.getCustomers(),
      suppliers: storage.getSuppliers(),
      orders: storage.getOrders(),
      dispatches: storage.getDispatches(),
      invoices: storage.getInvoices(),
      payments: storage.getPayments(),
      purchases: storage.getPurchases(),
      stockLogs: storage.getStockLogs(),
      settings: storage.getSettings(),
      staff: storage.getStaff()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StockFlow_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Business settings and invoice remittance details saved successfully!</span>
        </div>
      )}
      {importStatus && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-blue-600" />
          <span>{importStatus}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Legal Entity & GST Registration */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Company Legal Entity & GST Configuration</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These details appear on your printed tax invoices and legal delivery challans
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Legal Company Name *</label>
              <input
                type="text"
                required
                value={settings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Trade Name / Brand Mark *</label>
              <input
                type="text"
                required
                value={settings.tradeName}
                onChange={(e) => handleChange('tradeName', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">GSTIN (15 Digits) *</label>
              <input
                type="text"
                required
                maxLength={15}
                value={settings.gstin}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">PAN Number *</label>
              <input
                type="text"
                required
                maxLength={10}
                value={settings.panNumber}
                onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">State & GST Code *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={settings.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-md"
                  placeholder="State"
                />
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={settings.stateCode}
                  onChange={(e) => handleChange('stateCode', e.target.value)}
                  className="w-16 px-2 py-1.5 border border-slate-200 rounded-md font-mono text-center"
                  placeholder="Code"
                />
              </div>
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-medium text-slate-700 mb-1">Registered Warehouse & APMC Office Address *</label>
            <textarea
              rows={2}
              required
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Official Phone *</label>
              <input
                type="text"
                required
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Operations Email *</label>
              <input
                type="email"
                required
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Website URL</label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bank Remittance & UPI Settlement */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Bank Remittance & UPI Payment Gateway Instructions</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Printed on every tax invoice so customers can settle dues via NEFT/RTGS or instant UPI
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Bank Name *</label>
              <input
                type="text"
                required
                value={settings.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={settings.accountNo}
                onChange={(e) => handleChange('accountNo', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">IFSC Code *</label>
              <input
                type="text"
                required
                value={settings.ifscCode}
                onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                value={settings.branchName}
                onChange={(e) => handleChange('branchName', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">UPI ID / VPA *</label>
              <input
                type="text"
                required
                value={settings.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder="company@bank"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Operational Prefixes & Valuation Basis */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Operational Prefixes & Stock Valuation Basis</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Serial numbering prefixes and accounting valuation standards
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Order Prefix</label>
              <input
                type="text"
                value={settings.orderPrefix}
                onChange={(e) => handleChange('orderPrefix', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Purchase PO Prefix</label>
              <input
                type="text"
                value={settings.purchasePrefix}
                onChange={(e) => handleChange('purchasePrefix', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Dispatch Prefix</label>
              <input
                type="text"
                value={settings.dispatchPrefix}
                onChange={(e) => handleChange('dispatchPrefix', e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Inventory Valuation Basis</label>
              <select
                value={settings.valuationMethod}
                onChange={(e) => handleChange('valuationMethod', e.target.value as any)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white font-medium"
              >
                <option value="fifo">FIFO (First-In, First-Out at Purchase Cost)</option>
                <option value="weighted_avg">Weighted Average Cost (WAC)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Default Customer Payment Terms</label>
              <select
                value={settings.defaultPaymentTerms}
                onChange={(e) => handleChange('defaultPaymentTerms', e.target.value as PaymentTerms)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white capitalize"
              >
                <option value="immediate">Immediate / Advance</option>
                <option value="net_7">Net 7 Days</option>
                <option value="net_15">Net 15 Days</option>
                <option value="net_30">Net 30 Days</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Business Settings</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 4: Prototype Maintenance, Backup & Factory Reset */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <span>Prototype Maintenance & Data Portability</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Safely backup all operational mock entities or reset back to clean factory FMCG sample seed
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div>
            <h4 className="font-bold text-slate-900">Download Full JSON Workspace Backup</h4>
            <p className="text-slate-500 mt-0.5 text-[11px]">
              Exports all products, customers, orders, dispatches, invoices, payments, and audit logs
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON Backup</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div>
            <h4 className="font-bold text-slate-900">Restore Workspace from JSON Backup</h4>
            <p className="text-slate-500 mt-0.5 text-[11px]">
              Upload a previously exported StockFlow JSON backup to restore all operational records
            </p>
          </div>
          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs transition-colors shrink-0 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Restore JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-rose-50/50 rounded-lg border border-rose-200 text-xs">
          <div>
            <h4 className="font-bold text-rose-900">Reset Prototype to Factory Sample Dataset</h4>
            <p className="text-rose-700 mt-0.5 text-[11px]">
              Restores initial FMCG products, Kirana store accounts, vendor depots, and sample orders
            </p>
          </div>
          <button
            type="button"
            onClick={onResetData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-md shadow-2xs transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
