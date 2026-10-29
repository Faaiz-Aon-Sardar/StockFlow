import React, { useState } from 'react';
import {
  Search,
  Receipt,
  Printer,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Building,
  CreditCard,
  QrCode,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Invoice, InvoiceStatus, Customer, Product, OrderItem } from '../types';
import { storage, formatINR, calculateLineItem, computeTaxBreakdown } from '../services/storage';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(storage.getInvoices());
  const [customers] = useState<Customer[]>(storage.getCustomers());
  const [products] = useState<Product[]>(storage.getProducts());

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Direct / Counter Invoice Modal State
  const [showDirectInvoiceModal, setShowDirectInvoiceModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [invoiceItems, setInvoiceItems] = useState<OrderItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState<string>('Direct counter sale (Spot wholesale dispatch)');

  const settings = storage.getSettings();

  const reloadData = () => {
    setInvoices(storage.getInvoices());
    if (viewingInvoice) {
      const refreshed = storage.getInvoices().find((inv) => inv.id === viewingInvoice.id);
      if (refreshed) setViewingInvoice(refreshed);
    }
  };

  const handleOpenDirectInvoice = () => {
    const firstP = products[0];
    const calc = calculateLineItem({
      quantity: 10,
      unitPrice: firstP?.defaultSellingPrice || 100,
      discountPercent: 0,
      taxRate: firstP?.gstRate || 5
    });

    setInvoiceItems([
      {
        productId: firstP?.id || '',
        sku: firstP?.sku || '',
        name: firstP?.name || '',
        uom: firstP?.uom || 'pcs',
        quantity: 10,
        unitPrice: firstP?.defaultSellingPrice || 100,
        discountPercent: 0,
        discountAmount: calc.discountAmount,
        taxRate: firstP?.gstRate || 5,
        taxAmount: calc.taxAmount,
        lineTotal: calc.lineTotal,
        hsnCode: firstP?.hsnCode || ''
      }
    ]);
    setSelectedCustomerId(customers[0]?.id || '');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setInvoiceNotes('Direct counter sale (Spot wholesale dispatch)');
    setShowDirectInvoiceModal(true);
  };

  const handleItemProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;

    const newItems = [...invoiceItems];
    const item = newItems[index];

    let price = prod.defaultSellingPrice;
    if (prod.wholesaleTiers?.length > 0 && item.quantity >= prod.wholesaleTiers[0].minQty) {
      price = prod.wholesaleTiers[0].unitPrice;
    }

    const calc = calculateLineItem({
      quantity: item.quantity,
      unitPrice: price,
      discountPercent: item.discountPercent,
      taxRate: prod.gstRate
    });

    newItems[index] = {
      ...item,
      productId: prod.id,
      sku: prod.sku,
      name: prod.name,
      uom: prod.uom,
      unitPrice: price,
      taxRate: prod.gstRate,
      discountAmount: calc.discountAmount,
      taxAmount: calc.taxAmount,
      lineTotal: calc.lineTotal,
      hsnCode: prod.hsnCode
    };

    setInvoiceItems(newItems);
  };

  const handleItemQuantityChange = (index: number, newQty: number) => {
    const newItems = [...invoiceItems];
    const item = newItems[index];
    const prod = products.find((p) => p.id === item.productId);

    let price = item.unitPrice;
    if (prod && prod.wholesaleTiers?.length > 0) {
      if (newQty >= prod.wholesaleTiers[0].minQty) {
        price = prod.wholesaleTiers[0].unitPrice;
      } else {
        price = prod.defaultSellingPrice;
      }
    }

    const calc = calculateLineItem({
      quantity: newQty,
      unitPrice: price,
      discountPercent: item.discountPercent,
      taxRate: item.taxRate
    });

    newItems[index] = {
      ...item,
      quantity: newQty,
      unitPrice: price,
      discountAmount: calc.discountAmount,
      taxAmount: calc.taxAmount,
      lineTotal: calc.lineTotal
    };

    setInvoiceItems(newItems);
  };

  const handleItemDiscountChange = (index: number, discountPct: number) => {
    const newItems = [...invoiceItems];
    const item = newItems[index];

    const calc = calculateLineItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: discountPct,
      taxRate: item.taxRate
    });

    newItems[index] = {
      ...item,
      discountPercent: discountPct,
      discountAmount: calc.discountAmount,
      taxAmount: calc.taxAmount,
      lineTotal: calc.lineTotal
    };

    setInvoiceItems(newItems);
  };

  const handleAddItemRow = () => {
    const prod = products[0];
    const calc = calculateLineItem({
      quantity: 5,
      unitPrice: prod.defaultSellingPrice,
      discountPercent: 0,
      taxRate: prod.gstRate
    });

    setInvoiceItems([
      ...invoiceItems,
      {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        uom: prod.uom,
        quantity: 5,
        unitPrice: prod.defaultSellingPrice,
        discountPercent: 0,
        discountAmount: calc.discountAmount,
        taxRate: prod.gstRate,
        taxAmount: calc.taxAmount,
        lineTotal: calc.lineTotal,
        hsnCode: prod.hsnCode
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const formSubtotal = invoiceItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const formDiscountTotal = invoiceItems.reduce((sum, it) => sum + it.discountAmount, 0);
  const formTaxTotal = invoiceItems.reduce((sum, it) => sum + it.taxAmount, 0);
  const formGrandTotal = invoiceItems.reduce((sum, it) => sum + it.lineTotal, 0);

  const handleSaveDirectInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceItems.length === 0) return;

    const cust = customers.find((c) => c.id === selectedCustomerId);
    const taxBreakdown = computeTaxBreakdown(invoiceItems, false);

    const saved = storage.saveInvoice({
      customerId: selectedCustomerId,
      customerName: cust?.name || 'Walk-in Retail Customer',
      customerGstin: cust?.gstin || '',
      billingAddress: cust?.billingAddress || 'Direct counter sale',
      shippingAddress: cust?.shippingAddress || cust?.billingAddress || 'Direct counter sale',
      issueDate,
      dueDate,
      items: invoiceItems,
      subtotal: formSubtotal,
      discountTotal: formDiscountTotal,
      taxBreakdown,
      taxTotal: formTaxTotal,
      grandTotal: formGrandTotal,
      status: 'issued',
      paymentTerms: cust ? cust.paymentTerms.replace('_', ' ') : 'Immediate',
      notes: invoiceNotes
    });

    reloadData();
    setShowDirectInvoiceModal(false);
    setViewingInvoice(saved);
    setFeedbackMessage({
      text: `Direct Tax Invoice ${saved.invoiceNumber} created and customer balance updated!`,
      type: 'success'
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleIssueInvoice = (inv: Invoice) => {
    storage.saveInvoice({
      ...inv,
      status: 'issued'
    });
    reloadData();
    if (viewingInvoice && viewingInvoice.id === inv.id) {
      setViewingInvoice({ ...inv, status: 'issued' });
    }
    setFeedbackMessage({
      text: `Invoice ${inv.invoiceNumber} has been officially issued and locked!`,
      type: 'success'
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleCancelInvoice = (inv: Invoice) => {
    if (inv.amountPaid > 0) {
      alert('Cannot cancel invoice with recorded payments. Please reverse payments first.');
      return;
    }

    if (window.confirm(`Are you sure you want to cancel tax invoice ${inv.invoiceNumber}? This will reverse the customer outstanding balance.`)) {
      storage.saveInvoice({
        ...inv,
        status: 'cancelled',
        balanceDue: 0
      });
      reloadData();
      if (viewingInvoice && viewingInvoice.id === inv.id) {
        setViewingInvoice({ ...inv, status: 'cancelled', balanceDue: 0 });
      }
      setFeedbackMessage({
        text: `Invoice ${inv.invoiceNumber} has been cancelled.`,
        type: 'success'
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerGstin && inv.customerGstin.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 pb-12">
      {feedbackMessage && (
        <div
          className={`p-3 rounded-md text-xs font-semibold flex items-center justify-between shadow-2xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-500 hover:text-slate-900 ml-2 text-xs font-normal"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Filter and Actions */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, or GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenDirectInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Direct Invoice</span>
            </button>
          </div>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1 shrink-0">Status:</span>
          {['all', 'issued', 'paid', 'partially_paid', 'overdue', 'draft', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-0.5 rounded text-xs capitalize whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            description="No tax invoices match the current filter selection."
            actionLabel="Create Direct Invoice"
            onAction={handleOpenDirectInvoice}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Customer / Retailer</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">GST Total</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {inv.customerName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {inv.customerGstin || 'Unregistered'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{inv.issueDate}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{inv.dueDate}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inv.status} type="invoice" />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatINR(inv.subtotal - (inv.discountTotal || 0))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatINR(inv.taxTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatINR(inv.grandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                      <span className={inv.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                        {formatINR(inv.balanceDue)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
                          title="View / Print Tax Invoice"
                        >
                          <Eye className="w-3 h-3" /> View / Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Direct / Counter Sale Invoice Modal */}
      <Modal
        isOpen={showDirectInvoiceModal}
        onClose={() => setShowDirectInvoiceModal(false)}
        title="Create Direct Counter Tax Invoice"
        subtitle="Generate GST invoice directly for walk-in wholesale buyers and immediate depot sales"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveDirectInvoice} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer / Retailer *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Invoice Items ({invoiceItems.length})</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] text-slate-500 mb-0.5">Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemProductChange(idx, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">Quantity ({item.uom})</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleItemQuantityChange(idx, Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-right bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">Rate (₹)</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        disabled
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-right bg-slate-100 text-slate-600"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] text-slate-500 mb-0.5">Disc %</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={item.discountPercent}
                        onChange={(e) => handleItemDiscountChange(idx, Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-right bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <label className="block text-[10px] text-slate-500 mb-0.5">Total</label>
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {formatINR(item.lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={invoiceItems.length === 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-mono">
                      HSN: {item.hsnCode} · GST: {item.taxRate}% (₹{item.taxAmount.toFixed(2)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Invoice Notes / Remarks</label>
              <input
                type="text"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1 text-xs self-start">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span className="font-mono tabular-nums">{formatINR(formSubtotal - formDiscountTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST Tax:</span>
                <span className="font-mono tabular-nums">{formatINR(formTaxTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Invoice Total:</span>
                <span className="font-mono tabular-nums">{formatINR(formGrandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDirectInvoiceModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              Issue Direct Tax Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Professional Printable Tax Invoice Modal */}
      <Modal
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        title={`Tax Invoice: ${viewingInvoice?.invoiceNumber}`}
        subtitle="GST Compliant B2B Tax Invoice (Form GST INV-1 Standard)"
        maxWidth="4xl"
      >
        {viewingInvoice && (
          <div className="space-y-4 text-xs">
            {/* Invoice Action Bar */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md no-print">
              <div className="flex items-center gap-2">
                <StatusBadge status={viewingInvoice.status} type="invoice" />
                {viewingInvoice.status === 'draft' && (
                  <span className="text-[11px] text-amber-700 font-medium">
                    (Draft mode — not yet legally issued)
                  </span>
                )}
                {viewingInvoice.status !== 'draft' && (
                  <span className="text-[11px] text-slate-500">
                    Locked issued document · Audit trail verified
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {viewingInvoice.status === 'draft' && (
                  <button
                    onClick={() => handleIssueInvoice(viewingInvoice)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                  >
                    Issue Invoice (Lock)
                  </button>
                )}
                {viewingInvoice.status !== 'cancelled' && viewingInvoice.amountPaid === 0 && (
                  <button
                    onClick={() => handleCancelInvoice(viewingInvoice)}
                    className="px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded"
                  >
                    Cancel Invoice
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>

            {/* Printable A4 Tax Invoice Canvas */}
            <div className="p-8 border border-slate-300 rounded-lg bg-white shadow-xs space-y-6 text-slate-900 print:border-none print:p-0 print:shadow-none">
              {/* Header: Company & Tax Invoice Title */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {settings.companyName}
                  </h2>
                  <p className="text-xs font-semibold text-slate-700">{settings.tradeName}</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm leading-relaxed">
                    {settings.address}
                  </p>
                  <div className="mt-2 text-xs font-mono space-y-0.5 text-slate-700">
                    <p><span className="font-bold text-slate-900 font-sans">GSTIN:</span> {settings.gstin}</p>
                    <p><span className="font-bold text-slate-900 font-sans">PAN:</span> {settings.panNumber}</p>
                    <p><span className="font-bold text-slate-900 font-sans">State:</span> {settings.state} (Code: {settings.stateCode})</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                    TAX INVOICE
                  </span>
                  <div className="mt-3 text-xs font-mono space-y-1 text-slate-800">
                    <p className="text-sm font-bold text-slate-900">{viewingInvoice.invoiceNumber}</p>
                    <p><span className="text-slate-500 font-sans">Issue Date:</span> {viewingInvoice.issueDate}</p>
                    <p><span className="text-slate-500 font-sans">Due Date:</span> {viewingInvoice.dueDate}</p>
                    {viewingInvoice.orderNumber && (
                      <p><span className="text-slate-500 font-sans">Order Ref:</span> {viewingInvoice.orderNumber}</p>
                    )}
                    <p><span className="text-slate-500 font-sans">Terms:</span> {viewingInvoice.paymentTerms}</p>
                  </div>
                </div>
              </div>

              {/* Billed To and Shipped To Columns */}
              <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                    Details of Receiver (Billed To):
                  </h4>
                  <p className="font-bold text-slate-900 text-sm">{viewingInvoice.customerName}</p>
                  <p className="text-slate-600 mt-1 leading-relaxed">{viewingInvoice.billingAddress}</p>
                  <p className="mt-2 font-mono text-xs">
                    <span className="font-bold text-slate-900 font-sans">Customer GSTIN: </span>
                    {viewingInvoice.customerGstin || 'URP (Unregistered Person)'}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                    Details of Consignee (Shipped To):
                  </h4>
                  <p className="font-bold text-slate-900 text-sm">{viewingInvoice.customerName}</p>
                  <p className="text-slate-600 mt-1 leading-relaxed">{viewingInvoice.shippingAddress}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Place of Supply: {settings.state} ({settings.stateCode})
                  </p>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3">Description of Goods</th>
                      <th className="py-2 px-3">HSN</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Rate (₹)</th>
                      <th className="py-2 px-3 text-right">Disc.</th>
                      <th className="py-2 px-3 text-right">Taxable</th>
                      <th className="py-2 px-3 text-right">GST %</th>
                      <th className="py-2 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {viewingInvoice.items.map((it, idx) => {
                      const base = it.quantity * it.unitPrice;
                      const taxable = base - (it.discountAmount || 0);
                      return (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <p className="font-bold text-slate-900">{it.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{it.sku}</p>
                          </td>
                          <td className="py-2 px-3 font-mono">{it.hsnCode}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">
                            {it.quantity} {it.uom}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">
                            {formatINR(it.unitPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                            {it.discountAmount > 0 ? formatINR(it.discountAmount) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatINR(taxable)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                            {it.taxRate}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                            {formatINR(it.lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* GST Tax Breakdown Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                <div className="border border-slate-200 rounded p-3 bg-slate-50 text-xs space-y-2">
                  <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                    GST Tax Analysis (Intra-State Supply)
                  </h4>
                  <table className="w-full text-left text-[11px]">
                    <thead className="border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="py-1">Rate</th>
                        <th className="py-1 text-right">Taxable Amt</th>
                        <th className="py-1 text-right">CGST</th>
                        <th className="py-1 text-right">SGST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingInvoice.taxBreakdown?.map((tb, idx) => (
                        <tr key={idx} className="font-mono tabular-nums">
                          <td className="py-1">{tb.rate}%</td>
                          <td className="py-1 text-right">{formatINR(tb.taxableAmount)}</td>
                          <td className="py-1 text-right">{formatINR(tb.cgst)}</td>
                          <td className="py-1 text-right">{formatINR(tb.sgst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>Total Taxable Value:</span>
                    <span className="font-mono tabular-nums">
                      {formatINR(viewingInvoice.subtotal - (viewingInvoice.discountTotal || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Total CGST + SGST Tax:</span>
                    <span className="font-mono tabular-nums">{formatINR(viewingInvoice.taxTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-300">
                    <span>Invoice Total Value:</span>
                    <span className="font-mono tabular-nums">{formatINR(viewingInvoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 pt-1 font-medium">
                    <span>Amount Received / Settled:</span>
                    <span className="font-mono tabular-nums">{formatINR(viewingInvoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-700 pt-1 border-t border-slate-200">
                    <span>Balance Outstanding Due:</span>
                    <span className="font-mono tabular-nums">{formatINR(viewingInvoice.balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Remittance & UPI QR Code Strip */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Bank Remittance Details:
                  </h4>
                  <div className="text-slate-700 space-y-0.5">
                    <p><span className="text-slate-500">Bank Name:</span> {settings.bankName}</p>
                    <p className="font-mono"><span className="text-slate-500 font-sans">A/C Number:</span> {settings.accountNo}</p>
                    <p className="font-mono"><span className="text-slate-500 font-sans">IFSC Code:</span> {settings.ifscCode}</p>
                    <p><span className="text-slate-500">Branch:</span> {settings.branchName}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-blue-600" /> UPI Direct Settlement:
                  </h4>
                  <p className="text-slate-700 font-mono">VPA: <span className="font-bold">{settings.upiId}</span></p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Please reference invoice number <span className="font-mono font-semibold">{viewingInvoice.invoiceNumber}</span> in payment remarks for immediate automated ledger reconciliation.
                  </p>
                </div>
              </div>

              {/* Signatures & Declarations */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs">
                <div>
                  <p className="font-bold text-slate-800 mb-1">Terms & Conditions:</p>
                  <ul className="list-disc pl-4 text-[10px] text-slate-500 space-y-0.5">
                    <li>Goods once sold will not be accepted back after 7 days from delivery.</li>
                    <li>Interest @ 18% per annum will be charged on delayed payments past the due date.</li>
                    <li>Subject to Mumbai jurisdiction only.</li>
                  </ul>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 mb-12">
                    For <span className="font-bold text-slate-900">{settings.companyName}</span>
                  </p>
                  <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-700 font-medium">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 no-print">
              <button
                onClick={() => setViewingInvoice(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
