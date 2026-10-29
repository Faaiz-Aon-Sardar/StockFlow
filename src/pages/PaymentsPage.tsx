import React, { useState } from 'react';
import {
  Search,
  Plus,
  CreditCard,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Printer
} from 'lucide-react';
import { Payment, PaymentMethod, Customer, Supplier, Invoice, PaymentAllocation } from '../types';
import { storage, formatINR } from '../services/storage';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>(storage.getPayments());
  const [customers] = useState<Customer[]>(storage.getCustomers());
  const [suppliers] = useState<Supplier[]>(storage.getSuppliers());
  const [invoices, setInvoices] = useState<Invoice[]>(storage.getInvoices());

  const [searchTerm, setSearchTerm] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all');

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  // Form State
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [selectedPartyId, setSelectedPartyId] = useState<string>(customers[0]?.id || '');
  const [amount, setAmount] = useState<number>(10000);
  const [paymentDate, setPaymentDate] = useState<string>('2026-10-27');
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const reloadData = () => {
    storage.recalculateCustomerOutstanding();
    setPayments(storage.getPayments());
    setInvoices(storage.getInvoices());
  };

  const handleOpenRecord = () => {
    const custId = customers[0]?.id || '';
    setPartyType('customer');
    setSelectedPartyId(custId);
    setAmount(10000);
    setPaymentDate('2026-10-27');
    setMethod('bank_transfer');
    setReferenceNo(`NEFT/HDFC/${Math.floor(100000 + Math.random() * 900000)}`);
    setNotes('');

    // Prepopulate allocations against open invoices of this customer
    const openInvoices = storage
      .getInvoices()
      .filter((inv) => inv.customerId === custId && inv.balanceDue > 0);

    const initAlloc: Record<string, number> = {};
    if (openInvoices.length > 0) {
      initAlloc[openInvoices[0].id] = Math.min(10000, openInvoices[0].balanceDue);
    }
    setAllocations(initAlloc);
    setShowRecordModal(true);
  };

  const handlePartyChange = (type: 'customer' | 'supplier', partyId: string) => {
    setPartyType(type);
    setSelectedPartyId(partyId);

    if (type === 'customer') {
      const openInvoices = storage
        .getInvoices()
        .filter((inv) => inv.customerId === partyId && inv.balanceDue > 0);
      const initAlloc: Record<string, number> = {};
      if (openInvoices.length > 0) {
        initAlloc[openInvoices[0].id] = Math.min(amount, openInvoices[0].balanceDue);
      }
      setAllocations(initAlloc);
    } else {
      setAllocations({});
    }
  };

  // Open invoices for currently selected customer in form
  const activeCustomerOpenInvoices =
    partyType === 'customer'
      ? invoices.filter((i) => i.customerId === selectedPartyId && i.balanceDue > 0)
      : [];

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remainingToAllocate = amount - totalAllocated;

  const handleAutoAllocate = () => {
    let unallocated = amount;
    const newAlloc: Record<string, number> = {};

    activeCustomerOpenInvoices.forEach((inv) => {
      if (unallocated <= 0) return;
      const take = Math.min(unallocated, inv.balanceDue);
      newAlloc[inv.id] = Number(take.toFixed(2));
      unallocated -= take;
    });

    setAllocations(newAlloc);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    if (totalAllocated > amount + 0.01) {
      alert(`Allocated amount (${formatINR(totalAllocated)}) cannot exceed total payment amount (${formatINR(amount)})!`);
      return;
    }

    const partyName =
      partyType === 'customer'
        ? customers.find((c) => c.id === selectedPartyId)?.name || 'Unknown Customer'
        : suppliers.find((s) => s.id === selectedPartyId)?.name || 'Unknown Supplier';

    const allocationList: PaymentAllocation[] = Object.entries(allocations)
      .filter(([_, val]) => Number(val) > 0)
      .map(([invoiceId, allocAmt]) => {
        const inv = invoices.find((i) => i.id === invoiceId);
        return {
          invoiceId,
          invoiceNumber: inv?.invoiceNumber || invoiceId,
          amountAllocated: Number(allocAmt)
        };
      });

    storage.recordPayment({
      date: paymentDate,
      partyType,
      partyId: selectedPartyId,
      partyName,
      amount: Number(amount),
      method,
      referenceNo,
      allocations: allocationList,
      notes
    });

    reloadData();
    setShowRecordModal(false);
  };

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referenceNo && p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = partyTypeFilter === 'all' || p.partyType === partyTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by receipt #, party name, or transaction UTR/reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <button
            onClick={handleOpenRecord}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment / Collection</span>
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Party Filter:</span>
          <button
            onClick={() => setPartyTypeFilter('all')}
            className={`px-2.5 py-0.5 rounded text-xs ${
              partyTypeFilter === 'all'
                ? 'bg-slate-900 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Ledger Records
          </button>
          <button
            onClick={() => setPartyTypeFilter('customer')}
            className={`px-2.5 py-0.5 rounded text-xs ${
              partyTypeFilter === 'customer'
                ? 'bg-emerald-800 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Customer Inflows (Collections)
          </button>
          <button
            onClick={() => setPartyTypeFilter('supplier')}
            className={`px-2.5 py-0.5 rounded text-xs ${
              partyTypeFilter === 'supplier'
                ? 'bg-slate-800 text-white font-medium'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Supplier Outflows (Disbursements)
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payment records found"
            description="No bank, cash, or UPI payments match the active filter."
            actionLabel="Record Payment"
            onAction={handleOpenRecord}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Receipt / Voucher #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Party Name & Type</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3">Reference / UTR #</th>
                  <th className="py-2.5 px-3">Allocations</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((pay) => {
                  const isCustomerInflow = pay.partyType === 'customer';
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {pay.paymentNumber}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{pay.date}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {pay.partyName}
                        </p>
                        <span
                          className={`text-[10px] font-medium capitalize ${
                            isCustomerInflow ? 'text-emerald-700' : 'text-slate-600'
                          }`}
                        >
                          {isCustomerInflow ? 'Customer Collection' : 'Supplier Payment'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 capitalize text-slate-700">
                        {pay.method.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {pay.referenceNo || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {pay.allocations.length === 0 ? (
                          <span className="text-slate-400">Unallocated / On Account</span>
                        ) : (
                          <div className="space-y-0.5">
                            {pay.allocations.map((a, i) => (
                              <span
                                key={i}
                                className="inline-block mr-1 font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200"
                              >
                                {a.invoiceNumber}: {formatINR(a.amountAllocated)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                        <span className={isCustomerInflow ? 'text-emerald-700' : 'text-slate-900'}>
                          {isCustomerInflow ? '+' : '-'}
                          {formatINR(pay.amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setViewingPayment(pay)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View receipt voucher"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Record Payment Modal with Multi-Invoice Allocation */}
      <Modal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        title="Record Financial Transaction & Invoice Allocation"
        subtitle="Multi-invoice settlement with anti-overallocation validation"
        maxWidth="2xl"
      >
        <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
          {/* Party type radio tabs */}
          <div className="flex items-center gap-4 p-2.5 bg-slate-50 rounded-md border border-slate-200">
            <span className="font-semibold text-slate-700">Transaction Type:</span>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-900">
              <input
                type="radio"
                name="partyType"
                checked={partyType === 'customer'}
                onChange={() => handlePartyChange('customer', customers[0]?.id || '')}
              />
              <span>Customer Collection (Inward)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-900">
              <input
                type="radio"
                name="partyType"
                checked={partyType === 'supplier'}
                onChange={() => handlePartyChange('supplier', suppliers[0]?.id || '')}
              />
              <span>Supplier Payment (Outward)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {partyType === 'customer' ? 'Customer Store *' : 'Supplier / Vendor *'}
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => handlePartyChange(partyType, e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white font-medium"
              >
                {partyType === 'customer'
                  ? customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Due: {formatINR(c.currentOutstanding)})
                      </option>
                    ))
                  : suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Payable: {formatINR(s.currentOutstanding)})
                      </option>
                    ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min={0.01}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Method *</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cash">Cash Collection</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Transaction Ref / UTR / Cheque #</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. HDFCN26289012"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          {/* Multi-Invoice Allocation Table for Customer Collections */}
          {partyType === 'customer' && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">Allocate to Open Invoices</h4>
                  <p className="text-[11px] text-slate-500">
                    Distribute payment amount across one or multiple outstanding invoices
                  </p>
                </div>
                {activeCustomerOpenInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoAllocate}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Auto-Allocate Oldest First
                  </button>
                )}
              </div>

              {activeCustomerOpenInvoices.length === 0 ? (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
                  This customer has no outstanding open invoices. The payment will be logged on account as an advance credit.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Due Date</th>
                        <th className="py-2 px-3 text-right">Invoice Total</th>
                        <th className="py-2 px-3 text-right">Balance Due</th>
                        <th className="py-2 px-3 text-right w-32">Allocate (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeCustomerOpenInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-2 px-3 font-mono font-medium text-slate-900">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{inv.dueDate}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatINR(inv.grandTotal)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-rose-700">
                            {formatINR(inv.balanceDue)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              max={inv.balanceDue}
                              value={allocations[inv.id] ?? ''}
                              onChange={(e) =>
                                setAllocations({
                                  ...allocations,
                                  [inv.id]: Math.min(inv.balanceDue, Number(e.target.value))
                                })
                              }
                              placeholder="0.00"
                              className="w-28 px-2 py-1 border border-slate-200 rounded text-right font-mono bg-white"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Allocation balance status */}
              <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-600">
                  Allocated: <strong className="font-mono">{formatINR(totalAllocated)}</strong> of{' '}
                  <strong className="font-mono">{formatINR(amount)}</strong>
                </span>
                <span
                  className={`font-semibold font-mono ${
                    remainingToAllocate < 0
                      ? 'text-rose-600'
                      : remainingToAllocate === 0
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {remainingToAllocate === 0
                    ? 'Fully Allocated (100%)'
                    : remainingToAllocate > 0
                    ? `${formatINR(remainingToAllocate)} unallocated (on account)`
                    : `Overallocated by ${formatINR(Math.abs(remainingToAllocate))}!`
                  }
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deposited at counter by Mr. Suresh"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowRecordModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={totalAllocated > amount + 0.01}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs disabled:opacity-50"
            >
              Confirm & Save Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* View Payment Receipt Voucher Modal */}
      <Modal
        isOpen={!!viewingPayment}
        onClose={() => setViewingPayment(null)}
        title={`Payment Voucher: ${viewingPayment?.paymentNumber}`}
        subtitle="Official Receipt & Ledger Allocation Voucher"
        maxWidth="md"
      >
        {viewingPayment && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Voucher Number:</span>
                <span className="font-mono font-bold text-slate-900">{viewingPayment.paymentNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-medium text-slate-900">{viewingPayment.date}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Party Name:</span>
                <span className="font-bold text-slate-900">{viewingPayment.partyName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Payment Method:</span>
                <span className="capitalize font-medium text-slate-900">{viewingPayment.method.replace('_', ' ')}</span>
              </div>
              {viewingPayment.referenceNo && (
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono text-slate-900">{viewingPayment.referenceNo}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm">
                <span className="font-bold text-slate-900">Total Amount:</span>
                <span className="font-mono font-bold text-emerald-700">{formatINR(viewingPayment.amount)}</span>
              </div>
            </div>

            {viewingPayment.allocations.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 mb-1.5">Invoice Allocations:</h4>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-3">Invoice Number</th>
                        <th className="py-1.5 px-3 text-right">Amount Allocated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingPayment.allocations.map((a, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-3 font-mono text-slate-900">{a.invoiceNumber}</td>
                          <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatINR(a.amountAllocated)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewingPayment.notes && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-700">Remarks: </span>
                {viewingPayment.notes}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() => setViewingPayment(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
