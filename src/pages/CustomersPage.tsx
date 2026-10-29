import React, { useState } from 'react';
import {
  Search,
  Plus,
  Users,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Receipt,
  FileText,
  Clock,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';
import { Customer, Invoice, Payment, SalesOrder, PaymentTerms } from '../types';
import { storage, formatINR } from '../services/storage';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageId } from '../components/layout/Sidebar';

interface CustomersPageProps {
  onNavigate?: (page: PageId) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ onNavigate }) => {
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('net_15');
  const [creditLimit, setCreditLimit] = useState<number>(100000);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const reloadData = () => {
    storage.recalculateCustomerOutstanding();
    const updated = storage.getCustomers();
    setCustomers(updated);
    if (selectedCustomer) {
      const refreshed = updated.find((c) => c.id === selectedCustomer.id);
      setSelectedCustomer(refreshed || null);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setCode(`CUST-${Math.floor(1000 + Math.random() * 9000)}`);
    setContactPerson('');
    setPhone('');
    setEmail('');
    setBillingAddress('');
    setShippingAddress('');
    setGstin('');
    setPaymentTerms('net_15');
    setCreditLimit(100000);
    setOpeningBalance(0);
    setNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setCode(c.code);
    setContactPerson(c.contactPerson);
    setPhone(c.phone);
    setEmail(c.email);
    setBillingAddress(c.billingAddress);
    setShippingAddress(c.shippingAddress);
    setGstin(c.gstin || '');
    setPaymentTerms(c.paymentTerms);
    setCreditLimit(c.creditLimit);
    setOpeningBalance(c.openingBalance);
    setNotes(c.notes || '');
    setShowAddModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    storage.saveCustomer({
      id: editingCustomer ? editingCustomer.id : undefined,
      name,
      code,
      contactPerson,
      phone,
      email,
      billingAddress,
      shippingAddress: shippingAddress || billingAddress,
      gstin: gstin.toUpperCase(),
      paymentTerms,
      creditLimit: Number(creditLimit),
      openingBalance: Number(openingBalance),
      notes
    });

    reloadData();
    setShowAddModal(false);
  };

  const handleToggleStatus = (customerId: string) => {
    storage.toggleCustomerStatus(customerId);
    reloadData();
  };

  const handleDeleteCustomer = (c: Customer) => {
    setErrorMessage(null);
    if (c.currentOutstanding > 0) {
      setErrorMessage(`Cannot delete "${c.name}" because they have an outstanding due of ${formatINR(c.currentOutstanding)}. Please settle dues or archive account.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete customer record "${c.name}"? This action cannot be undone.`)) {
      try {
        storage.deleteCustomer(c.id);
        if (selectedCustomer?.id === c.id) {
          setSelectedCustomer(null);
        }
        reloadData();
      } catch (err: any) {
        setErrorMessage(err.message || 'Error deleting customer');
      }
    }
  };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? c.status !== 'archived'
        : c.status === 'archived';

    return matchesSearch && matchesStatus;
  });

  // Sub-data for selected customer ledger drawer
  const customerInvoices = selectedCustomer
    ? storage.getInvoices().filter((inv) => inv.customerId === selectedCustomer.id)
    : [];

  const customerPayments = selectedCustomer
    ? storage.getPayments().filter((p) => p.partyType === 'customer' && p.partyId === selectedCustomer.id)
    : [];

  return (
    <div className="space-y-5 pb-12">
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 font-bold hover:underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by store name, GSTIN, phone, or customer code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1">Status:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Accounts ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              statusFilter === 'active'
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active ({customers.filter((c) => c.status !== 'archived').length})
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              statusFilter === 'archived'
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Archived ({customers.filter((c) => c.status === 'archived').length})
          </button>
        </div>
      </div>

      {/* Customer List & Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers found"
              description="No registered wholesale accounts match your search criteria."
              actionLabel="Add Customer"
              onAction={handleOpenAdd}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Business & Contact</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3">Payment Terms</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    const isArchived = c.status === 'archived';
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        } ${isArchived ? 'opacity-70 bg-slate-50/40' : ''}`}
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                          {c.code}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {c.contactPerson} · {c.phone}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                          {c.gstin || <span className="text-slate-400">Unregistered</span>}
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-600">
                          {c.paymentTerms.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                          <span
                            className={
                              c.currentOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }
                          >
                            {formatINR(c.currentOutstanding)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              isArchived
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(c);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded"
                              title="Edit customer profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(c.id);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded"
                              title={isArchived ? 'Restore customer' : 'Archive customer'}
                            >
                              {isArchived ? (
                                <RotateCcw className="w-3.5 h-3.5" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomer(c);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                              title="Delete customer record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Customer Statement Drawer (1 col) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-4">
          {selectedCustomer ? (
            <>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCustomer.code} · {selectedCustomer.contactPerson}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedCustomer)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(selectedCustomer.id)}
                    className="text-xs text-slate-500 hover:text-amber-600 hover:underline font-medium"
                  >
                    {selectedCustomer.status === 'archived' ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">Current Balance:</span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      selectedCustomer.currentOutstanding > 0
                        ? 'text-rose-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatINR(selectedCustomer.currentOutstanding)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">Credit Limit:</span>
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {formatINR(selectedCustomer.creditLimit)}
                  </span>
                </div>
              </div>

              {/* Inter-Module Quick Actions */}
              {onNavigate && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onNavigate('orders')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded border border-blue-200 transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>New Order</span>
                  </button>
                  <button
                    onClick={() => onNavigate('payments')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded border border-emerald-200 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{selectedCustomer.billingAddress}</span>
                </div>
                {selectedCustomer.gstin && (
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-400 font-sans">GSTIN:</span>
                    <span className="font-semibold text-slate-900">{selectedCustomer.gstin}</span>
                  </div>
                )}
              </div>

              {/* Invoices History */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-500" /> Invoices ({customerInvoices.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {customerInvoices.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No invoices generated yet.</p>
                  ) : (
                    customerInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded text-[11px] border border-slate-200/60"
                      >
                        <div>
                          <p className="font-mono font-medium text-slate-900">{inv.invoiceNumber}</p>
                          <p className="text-slate-400">{inv.issueDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold tabular-nums text-slate-900">
                            {formatINR(inv.grandTotal)}
                          </p>
                          <StatusBadge status={inv.status} type="invoice" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payments History */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Collections ({customerPayments.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {customerPayments.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No payments recorded yet.</p>
                  ) : (
                    customerPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded text-[11px] border border-slate-200/60"
                      >
                        <div>
                          <p className="font-mono font-medium text-slate-900">{p.paymentNumber}</p>
                          <p className="text-slate-400 capitalize">{p.date} · {p.method.replace('_', ' ')}</p>
                        </div>
                        <p className="font-mono font-semibold tabular-nums text-emerald-700">
                          +{formatINR(p.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Select any customer from the table to inspect their real-time ledger, order history, and payment allocations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingCustomer ? 'Edit Customer Record' : 'Register New Customer Account'}
        subtitle="Manage billing details, GSTIN compliance, and credit terms"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer / Trade Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shree Ganesh Retail Mart"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 00000"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@domain.com"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Billing Address *</label>
              <textarea
                rows={2}
                required
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Full shop / street / area address with PIN code"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Shipping Address</label>
              <textarea
                rows={2}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Leave blank if identical to billing address"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AABCP8921K1Z2"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              >
                <option value="immediate">Immediate / Advance</option>
                <option value="net_7">Net 7 Days</option>
                <option value="net_15">Net 15 Days</option>
                <option value="net_30">Net 30 Days</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                min={0}
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Internal Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery timings, preferred transport provider, discount agreements"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
