import React, { useState } from 'react';
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  CreditCard,
  Edit2
} from 'lucide-react';
import { Supplier, PurchaseOrder, Payment, PaymentTerms } from '../types';
import { storage, formatINR } from '../services/storage';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageId } from '../components/layout/Sidebar';

interface SuppliersPageProps {
  onNavigate?: (page: PageId) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ onNavigate }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(storage.getSuppliers());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('net_15');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const reloadData = () => {
    setSuppliers(storage.getSuppliers());
    if (selectedSupplier) {
      const refreshed = storage.getSuppliers().find((s) => s.id === selectedSupplier.id);
      if (refreshed) setSelectedSupplier(refreshed);
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setCode(`SUP-${Math.floor(100 + Math.random() * 900)}`);
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstin('');
    setPaymentTerms('net_15');
    setOpeningBalance(0);
    setNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setCode(s.code);
    setContactPerson(s.contactPerson);
    setPhone(s.phone);
    setEmail(s.email);
    setAddress(s.address);
    setGstin(s.gstin || '');
    setPaymentTerms(s.paymentTerms);
    setOpeningBalance(s.openingBalance);
    setNotes(s.notes || '');
    setShowAddModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    storage.saveSupplier({
      id: editingSupplier ? editingSupplier.id : undefined,
      name,
      code,
      contactPerson,
      phone,
      email,
      address,
      gstin: gstin.toUpperCase(),
      paymentTerms,
      openingBalance: Number(openingBalance),
      notes
    });

    reloadData();
    setShowAddModal(false);
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const supplierPurchases = selectedSupplier
    ? storage.getPurchases().filter((po) => po.supplierId === selectedSupplier.id)
    : [];

  const supplierPayments = selectedSupplier
    ? storage.getPayments().filter((p) => p.partyType === 'supplier' && p.partyId === selectedSupplier.id)
    : [];

  return (
    <div className="space-y-5 pb-12">
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor name, GSTIN, code, or phone..."
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
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Grid: Supplier Table & Selected Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No suppliers found"
              description="No vendor or FMCG distributor matched your search."
              actionLabel="Add Supplier"
              onAction={handleOpenAdd}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Manufacturer / Supplier</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3">Payment Terms</th>
                    <th className="py-2.5 px-3 text-right">Payable Balance</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => {
                    const isSelected = selectedSupplier?.id === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSupplier(s)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                          {s.code}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {s.contactPerson} · {s.phone}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                          {s.gstin || '—'}
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-600">
                          {s.paymentTerms.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                          {formatINR(s.currentOutstanding)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(s);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            title="Edit supplier profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Supplier Drawer */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-4">
          {selectedSupplier ? (
            <>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {selectedSupplier.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedSupplier.code} · {selectedSupplier.contactPerson}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenEdit(selectedSupplier)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Edit
                </button>
              </div>

              {/* Outstanding Payable Card */}
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                <span className="text-slate-500 block">Total Payable to Supplier:</span>
                <span className="font-mono text-base font-bold text-slate-900">
                  {formatINR(selectedSupplier.currentOutstanding)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1 capitalize">
                  Terms: {selectedSupplier.paymentTerms.replace('_', ' ')}
                </span>
              </div>

              {/* Contact info */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{selectedSupplier.phone}</span>
                </div>
                {selectedSupplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedSupplier.email}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{selectedSupplier.address}</span>
                </div>
                {selectedSupplier.gstin && (
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-400 font-sans">GSTIN:</span>
                    <span className="font-semibold text-slate-900">{selectedSupplier.gstin}</span>
                  </div>
                )}
              </div>

              {/* Purchase History */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-500" /> Purchase Orders ({supplierPurchases.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {supplierPurchases.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No purchase orders placed yet.</p>
                  ) : (
                    supplierPurchases.map((po) => (
                      <div
                        key={po.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded text-[11px] border border-slate-200/60"
                      >
                        <div>
                          <p className="font-mono font-medium text-slate-900">{po.purchaseRef}</p>
                          <p className="text-slate-400">{po.orderDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold tabular-nums text-slate-900">
                            {formatINR(po.grandTotal)}
                          </p>
                          <StatusBadge status={po.status} type="purchase" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Vendor Disbursements */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Payments Disbursed ({supplierPayments.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {supplierPayments.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No payments disbursed yet.</p>
                  ) : (
                    supplierPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded text-[11px] border border-slate-200/60"
                      >
                        <div>
                          <p className="font-mono font-medium text-slate-900">{p.paymentNumber}</p>
                          <p className="text-slate-400 capitalize">{p.date} · {p.method.replace('_', ' ')}</p>
                        </div>
                        <p className="font-mono font-semibold tabular-nums text-slate-900">
                          {formatINR(p.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Select any supplier from the table to view their procurement orders, payment receipts, and balance status.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingSupplier ? 'Edit Supplier Record' : 'Add New Vendor / Supplier'}
        subtitle="Manage FMCG manufacturer depots, C&F agencies, and payment terms"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company / Vendor Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adani Wilmar Limited Depot"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Supplier Code *</label>
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
              <label className="block font-medium text-slate-700 mb-1">Key Account Contact</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Sanjay Nair"
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
                placeholder="+91 22 2784 1000"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="depot@vendor.in"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Depot / Warehouse Address *</label>
            <textarea
              rows={2}
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full depot address with city and state"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AAACA1234D1ZP"
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
                <option value="immediate">Immediate</option>
                <option value="net_7">Net 7 Days</option>
                <option value="net_15">Net 15 Days</option>
                <option value="net_30">Net 30 Days</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Opening Payable (₹)</label>
              <input
                type="number"
                min={0}
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Authorized product lines, order cutoff timings"
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
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
