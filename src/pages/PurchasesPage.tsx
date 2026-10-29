import React, { useState } from 'react';
import {
  Search,
  Plus,
  ShoppingBag,
  PackageCheck,
  Eye,
  Trash2,
  Calendar,
  Truck,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { PurchaseOrder, PurchaseItem, Supplier, Product } from '../types';
import { storage, formatINR } from '../services/storage';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';

export const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(storage.getPurchases());
  const [suppliers] = useState<Supplier[]>(storage.getSuppliers());
  const [products] = useState<Product[]>(storage.getProducts());

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseOrder | null>(null);

  // Goods Receipt Modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseOrder | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});
  const [receiveOperator, setReceiveOperator] = useState<string>('Rajesh Sharma (Warehouse)');

  // Return to Vendor Modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returningPurchase, setReturningPurchase] = useState<PurchaseOrder | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<string>('Damaged packaging / leaks during transport');
  const [returnOperator, setReturnOperator] = useState<string>('Rajesh Sharma (Warehouse)');

  // New PO form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [orderDate, setOrderDate] = useState<string>('2026-10-27');
  const [expectedDate, setExpectedDate] = useState<string>('2026-10-30');
  const [notes, setNotes] = useState<string>('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  const reloadData = () => {
    setPurchases(storage.getPurchases());
  };

  const handleOpenCreate = () => {
    const firstP = products[0];
    const base = 50 * (firstP?.purchaseCost || 100);
    const tax = (base * (firstP?.gstRate || 5)) / 100;

    setPurchaseItems([
      {
        productId: firstP?.id || '',
        sku: firstP?.sku || '',
        name: firstP?.name || '',
        uom: firstP?.uom || 'pcs',
        quantityOrdered: 50,
        quantityReceived: 0,
        unitCost: firstP?.purchaseCost || 100,
        taxRate: firstP?.gstRate || 5,
        taxAmount: tax,
        lineTotal: base + tax,
        hsnCode: firstP?.hsnCode || ''
      }
    ]);
    setSelectedSupplierId(suppliers[0]?.id || '');
    setOrderDate('2026-10-27');
    setExpectedDate('2026-10-30');
    setNotes('');
    setShowCreateModal(true);
  };

  const handleItemProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;

    const newItems = [...purchaseItems];
    const it = newItems[index];
    const base = it.quantityOrdered * prod.purchaseCost;
    const tax = (base * prod.gstRate) / 100;

    newItems[index] = {
      ...it,
      productId: prod.id,
      sku: prod.sku,
      name: prod.name,
      uom: prod.uom,
      unitCost: prod.purchaseCost,
      taxRate: prod.gstRate,
      taxAmount: tax,
      lineTotal: base + tax,
      hsnCode: prod.hsnCode
    };

    setPurchaseItems(newItems);
  };

  const handleItemQtyChange = (index: number, newQty: number) => {
    const newItems = [...purchaseItems];
    const it = newItems[index];
    const base = newQty * it.unitCost;
    const tax = (base * it.taxRate) / 100;

    newItems[index] = {
      ...it,
      quantityOrdered: newQty,
      taxAmount: tax,
      lineTotal: base + tax
    };

    setPurchaseItems(newItems);
  };

  const handleAddItemRow = () => {
    const prod = products[0];
    const base = 20 * prod.purchaseCost;
    const tax = (base * prod.gstRate) / 100;

    setPurchaseItems([
      ...purchaseItems,
      {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        uom: prod.uom,
        quantityOrdered: 20,
        quantityReceived: 0,
        unitCost: prod.purchaseCost,
        taxRate: prod.gstRate,
        taxAmount: tax,
        lineTotal: base + tax,
        hsnCode: prod.hsnCode
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const formSubtotal = purchaseItems.reduce((sum, it) => sum + it.quantityOrdered * it.unitCost, 0);
  const formTaxTotal = purchaseItems.reduce((sum, it) => sum + it.taxAmount, 0);
  const formGrandTotal = purchaseItems.reduce((sum, it) => sum + it.lineTotal, 0);

  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0) return;

    storage.savePurchaseOrder({
      supplierId: selectedSupplierId,
      orderDate,
      expectedDate,
      items: purchaseItems,
      subtotal: formSubtotal,
      taxTotal: formTaxTotal,
      grandTotal: formGrandTotal,
      notes
    });

    reloadData();
    setShowCreateModal(false);
    setFeedbackMessage({
      text: 'Purchase order placed successfully with supplier depot!',
      type: 'success'
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleOpenReceive = (po: PurchaseOrder) => {
    setReceivingPurchase(po);
    const initialCounts: Record<string, number> = {};
    po.items.forEach((it) => {
      const remaining = Math.max(0, it.quantityOrdered - (it.quantityReceived || 0));
      initialCounts[it.productId] = remaining;
    });
    setReceiptQuantities(initialCounts);
    setShowReceiveModal(true);
  };

  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPurchase) return;

    const receivedPayload = Object.entries(receiptQuantities).map(([productId, qty]) => ({
      productId,
      quantityReceived: Number(qty)
    }));

    storage.receiveGoods(receivingPurchase.id, receivedPayload, receiveOperator);
    reloadData();
    setShowReceiveModal(false);
    setFeedbackMessage({
      text: `Inward goods receipt verified! Current physical inventory incremented.`,
      type: 'success'
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleOpenReturn = (po: PurchaseOrder) => {
    setReturningPurchase(po);
    const initialReturn: Record<string, number> = {};
    po.items.forEach((it) => {
      initialReturn[it.productId] = 0;
    });
    setReturnQuantities(initialReturn);
    setReturnReason('Damaged packaging / leaks during transport');
    setShowReturnModal(true);
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningPurchase) return;

    const payload = Object.entries(returnQuantities)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity: Number(quantity)
      }));

    if (payload.length === 0) {
      alert('Please enter a return quantity greater than 0 for at least one item.');
      return;
    }

    try {
      storage.recordSupplierReturn(returningPurchase.id, payload, returnReason, returnOperator);
      reloadData();
      setShowReturnModal(false);
      setFeedbackMessage({
        text: `Supplier return recorded! Inventory updated and return audit log generated.`,
        type: 'success'
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error processing supplier return');
    }
  };

  const handleCancelPO = (po: PurchaseOrder) => {
    const totalReceived = po.items.reduce((sum, it) => sum + (it.quantityReceived || 0), 0);
    if (totalReceived > 0) {
      alert('Cannot cancel a PO that has already received items. Please use Return to Vendor instead.');
      return;
    }

    if (window.confirm(`Are you sure you want to cancel Purchase Order ${po.purchaseRef}?`)) {
      storage.savePurchaseOrder({
        ...po,
        status: 'cancelled'
      });
      reloadData();
      if (viewingPurchase && viewingPurchase.id === po.id) {
        setViewingPurchase({ ...po, status: 'cancelled' });
      }
      setFeedbackMessage({
        text: `Purchase Order ${po.purchaseRef} has been cancelled.`,
        type: 'success'
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const filtered = purchases.filter((po) => {
    const matchesSearch =
      po.purchaseRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
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

      {/* Top Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PO reference or manufacturer/supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1 shrink-0">Status:</span>
          {['all', 'ordered', 'partially_received', 'received', 'cancelled'].map((st) => (
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

      {/* Purchases Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No purchase orders found"
            description="No vendor procurement orders match your filter criteria."
            actionLabel="Create Purchase Order"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">PO Reference</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Order Date</th>
                  <th className="py-2.5 px-3">Items Qty</th>
                  <th className="py-2.5 px-3">Receipt Status</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3 text-right">PO Total</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((po) => {
                  const totalOrdered = po.items.reduce((sum, it) => sum + it.quantityOrdered, 0);
                  const totalReceived = po.items.reduce((sum, it) => sum + (it.quantityReceived || 0), 0);
                  const canReceive = po.status === 'ordered' || po.status === 'partially_received';
                  const canReturn = totalReceived > 0;
                  const canCancel = po.status === 'ordered';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {po.purchaseRef}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[200px]">
                        {po.supplierName}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        {po.orderDate}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                        {totalReceived} / {totalOrdered} received
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={po.status} type="purchase" />
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={po.paymentStatus} type="payment" />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatINR(po.grandTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingPurchase(po)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Inspect purchase order details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canReceive && (
                            <button
                              onClick={() => handleOpenReceive(po)}
                              className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                              title="Verify inward shipment and increment inventory"
                            >
                              Receive Goods
                            </button>
                          )}
                          {canReturn && (
                            <button
                              onClick={() => handleOpenReturn(po)}
                              className="px-2 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded"
                              title="Return damaged or defective items to vendor"
                            >
                              Return Items
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleCancelPO(po)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Cancel PO"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Inspect Purchase Order Modal */}
      <Modal
        isOpen={!!viewingPurchase}
        onClose={() => setViewingPurchase(null)}
        title={`Purchase Order: ${viewingPurchase?.purchaseRef}`}
        subtitle={`Supplier: ${viewingPurchase?.supplierName}`}
        maxWidth="3xl"
      >
        {viewingPurchase && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">PO Status</span>
                  <StatusBadge status={viewingPurchase.status} type="purchase" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment Status</span>
                  <StatusBadge status={viewingPurchase.paymentStatus} type="payment" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(viewingPurchase.status === 'ordered' || viewingPurchase.status === 'partially_received') && (
                  <button
                    onClick={() => {
                      const po = viewingPurchase;
                      setViewingPurchase(null);
                      handleOpenReceive(po);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
                  >
                    Receive Inward Stock
                  </button>
                )}
                {viewingPurchase.items.some((it) => (it.quantityReceived || 0) > 0) && (
                  <button
                    onClick={() => {
                      const po = viewingPurchase;
                      setViewingPurchase(null);
                      handleOpenReturn(po);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded"
                  >
                    Return Items to Vendor
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Item / SKU</th>
                    <th className="py-2 px-3 text-right">Qty Ordered</th>
                    <th className="py-2 px-3 text-right">Qty Received</th>
                    <th className="py-2 px-3 text-right">Unit Cost</th>
                    <th className="py-2 px-3 text-right">GST %</th>
                    <th className="py-2 px-3 text-right">Total (inc. GST)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingPurchase.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <p className="font-semibold text-slate-900">{it.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {it.sku} · HSN: {it.hsnCode}
                        </p>
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {it.quantityOrdered} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {it.quantityReceived || 0} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatINR(it.unitCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {it.taxRate}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatINR(it.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-1 p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono tabular-nums">{formatINR(viewingPurchase.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Tax:</span>
                  <span className="font-mono tabular-nums">{formatINR(viewingPurchase.taxTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono tabular-nums">{formatINR(viewingPurchase.grandTotal)}</span>
                </div>
              </div>
            </div>

            {viewingPurchase.notes && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-700">Notes: </span>
                {viewingPurchase.notes}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Receive Goods Modal (Updates Inventory & Movement Log) */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Record Goods Receipt (Inward Stock Verification)"
        subtitle={`Verify inward quantities received against ${receivingPurchase?.purchaseRef}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleConfirmReceipt} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50/60 rounded-md border border-amber-200/80 text-amber-800">
            <p className="font-semibold">Warehouse Receiving Rule:</p>
            <p className="text-[11px] mt-0.5">
              Entering received quantities here will directly increment warehouse inventory and generate an immutable inward stock receipt log.
            </p>
          </div>

          <div className="border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Item Name</th>
                  <th className="py-2 px-3 text-right">Ordered</th>
                  <th className="py-2 px-3 text-right">Previously Received</th>
                  <th className="py-2 px-3 text-right w-28">Receive Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivingPurchase?.items.map((it) => (
                  <tr key={it.productId}>
                    <td className="py-2 px-3">
                      <p className="font-medium text-slate-900">{it.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{it.sku}</p>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {it.quantityOrdered} {it.uom}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {it.quantityReceived || 0} {it.uom}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={it.quantityOrdered - (it.quantityReceived || 0)}
                        value={receiptQuantities[it.productId] ?? 0}
                        onChange={(e) =>
                          setReceiptQuantities({
                            ...receiptQuantities,
                            [it.productId]: Number(e.target.value)
                          })
                        }
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-right font-mono bg-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Receiving Store Operator *</label>
            <input
              type="text"
              required
              value={receiveOperator}
              onChange={(e) => setReceiveOperator(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowReceiveModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-2xs"
            >
              Confirm Goods Received & Increment Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Return to Vendor Modal (Debit Note / Stock Out) */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Return Goods to Vendor (Debit Note / Supplier Return)"
        subtitle={`Return defective or transit-damaged items against ${returningPurchase?.purchaseRef}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50/70 rounded-md border border-amber-200 text-amber-900">
            <p className="font-semibold">Stock Return Audit Notice:</p>
            <p className="text-[11px] mt-0.5">
              Quantities entered here will be deducted from warehouse inventory, and an audit entry of type "Return to Vendor" will be written to the stock ledger.
            </p>
          </div>

          <div className="border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Item Name</th>
                  <th className="py-2 px-3 text-right">Received Qty</th>
                  <th className="py-2 px-3 text-right w-28">Return Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returningPurchase?.items
                  .filter((it) => (it.quantityReceived || 0) > 0)
                  .map((it) => (
                    <tr key={it.productId}>
                      <td className="py-2 px-3">
                        <p className="font-medium text-slate-900">{it.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{it.sku}</p>
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {it.quantityReceived || 0} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={it.quantityReceived || 0}
                          value={returnQuantities[it.productId] ?? 0}
                          onChange={(e) =>
                            setReturnQuantities({
                              ...returnQuantities,
                              [it.productId]: Number(e.target.value)
                            })
                          }
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-right font-mono bg-white"
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Return Reason *</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              >
                <option value="Damaged packaging / leaks during transport">Damaged packaging / leaks during transport</option>
                <option value="Near expiry or expired batch delivered">Near expiry or expired batch delivered</option>
                <option value="Quality mismatch / seal broken">Quality mismatch / seal broken</option>
                <option value="Incorrect SKU / wrong variant dispatched">Incorrect SKU / wrong variant dispatched</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Authorizing Store Operator *</label>
              <input
                type="text"
                required
                value={returnOperator}
                onChange={(e) => setReturnOperator(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowReturnModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-2xs"
            >
              Confirm Supplier Return & Deduct Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Place Purchase Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Purchase Order (Procurement)"
        subtitle="Order fresh stock from FMCG brand depots and manufacturer C&F agents"
        maxWidth="3xl"
      >
        <form onSubmit={handleSavePurchaseOrder} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Supplier / Depot *</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">PO Order Date *</label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Expected Delivery *</label>
              <input
                type="date"
                required
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Procurement Items ({purchaseItems.length})</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Product Item</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Purchase Cost (₹)</th>
                    <th className="py-2 px-3 text-right">GST %</th>
                    <th className="py-2 px-3 text-right">Line Total</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 px-3">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(index, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={1}
                          value={item.quantityOrdered}
                          onChange={(e) => handleItemQtyChange(index, Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-slate-200 rounded text-right font-mono bg-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => {
                            const newCost = Number(e.target.value);
                            const newItems = [...purchaseItems];
                            const base = item.quantityOrdered * newCost;
                            const tax = (base * item.taxRate) / 100;
                            newItems[index] = {
                              ...item,
                              unitCost: newCost,
                              taxAmount: tax,
                              lineTotal: base + tax
                            };
                            setPurchaseItems(newItems);
                          }}
                          className="w-24 px-2 py-1 border border-slate-200 rounded text-right font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {item.taxRate}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatINR(item.lineTotal)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          disabled={purchaseItems.length === 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums">{formatINR(formSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST Tax:</span>
                <span className="font-mono tabular-nums">{formatINR(formTaxTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>PO Total:</span>
                <span className="font-mono tabular-nums">{formatINR(formGrandTotal)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Notes / Instructions</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Include batch inspection certificate with delivery challan"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              Place Purchase Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
