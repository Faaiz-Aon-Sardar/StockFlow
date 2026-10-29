import React, { useState } from 'react';
import {
  Search,
  PackageCheck,
  Truck,
  Eye,
  Printer,
  Calendar,
  Send,
  CheckCircle,
  FileCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Dispatch, SalesOrder, Product } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';

export const DispatchesPage: React.FC = () => {
  const [dispatches, setDispatches] = useState<Dispatch[]>(storage.getDispatches());
  const [orders, setOrders] = useState<SalesOrder[]>(storage.getOrders());
  const [products] = useState<Product[]>(storage.getProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'dispatched' | 'queue'>('queue');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedOrderToDispatch, setSelectedOrderToDispatch] = useState<SalesOrder | null>(null);
  const [carrierName, setCarrierName] = useState('Jai Maharashtra Logistics (Tempo)');
  const [vehicleNo, setVehicleNo] = useState('MH-04-EK-4592');
  const [dispatchQuantities, setDispatchQuantities] = useState<Record<string, number>>({});
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [operator, setOperator] = useState('Rajesh Sharma (Store)');
  const [viewingDispatch, setViewingDispatch] = useState<Dispatch | null>(null);

  const reloadData = () => {
    setDispatches(storage.getDispatches());
    setOrders(storage.getOrders());
    if (viewingDispatch) {
      const refreshed = storage.getDispatches().find((d) => d.id === viewingDispatch.id);
      if (refreshed) setViewingDispatch(refreshed);
    }
  };

  // Orders awaiting dispatch (confirmed or partially dispatched)
  const awaitingOrders = orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'partially_dispatched'
  );

  const handleOpenDispatchForOrder = (order: SalesOrder) => {
    setSelectedOrderToDispatch(order);
    const initialQty: Record<string, number> = {};
    order.items.forEach((it) => {
      initialQty[it.productId] = it.quantity;
    });
    setDispatchQuantities(initialQty);
    setCarrierName('Tempo Carrier (MH-04)');
    setVehicleNo(`MH-04-AB-${Math.floor(1000 + Math.random() * 9000)}`);
    setDispatchNotes('Goods verified and packed securely in wooden pallets');
    setShowDispatchModal(true);
  };

  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderToDispatch) return;

    const payload = Object.entries(dispatchQuantities)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity: Number(quantity)
      }));

    if (payload.length === 0) {
      alert('Please specify quantity to dispatch for at least one item.');
      return;
    }

    try {
      storage.recordDispatch({
        orderId: selectedOrderToDispatch.id,
        carrierName,
        vehicleOrTrackingNo: vehicleNo,
        itemsToDispatch: payload,
        notes: dispatchNotes,
        operator
      });

      reloadData();
      setShowDispatchModal(false);
      setActiveTab('dispatched');
      setFeedbackMessage({
        text: `Order dispatched! Physical inventory decremented and delivery challan generated.`,
        type: 'success'
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error recording dispatch');
    }
  };

  const handleMarkAsDelivered = (dispatchId: string) => {
    storage.updateDispatchStatus(dispatchId, 'delivered');
    reloadData();
    setFeedbackMessage({
      text: `Dispatch marked as delivered! Customer delivery confirmed.`,
      type: 'success'
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handlePrintManifest = () => {
    window.print();
  };

  const filteredDispatches = dispatches.filter(
    (d) =>
      d.dispatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vehicleOrTrackingNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Top Filter and Segmented Tabs */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'queue'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awaiting Dispatch ({awaitingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('dispatched')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'dispatched'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dispatched History ({dispatches.length})
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search dispatches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Orders Awaiting Dispatch */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fulfillment Queue</h3>
              <p className="text-xs text-slate-500">
                Orders with confirmed stock ready to be packed and loaded onto carrier vehicles
              </p>
            </div>
          </div>

          {awaitingOrders.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="All orders are dispatched"
              description="No confirmed orders are currently waiting in the warehouse dispatch queue."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Order Number</th>
                    <th className="py-2.5 px-3">Customer Destination</th>
                    <th className="py-2.5 px-3">Order Date</th>
                    <th className="py-2.5 px-3">Total Qty</th>
                    <th className="py-2.5 px-3">Dispatched / Remaining</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Fulfillment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {awaitingOrders.map((ord) => {
                    const remaining = ord.totalQty - (ord.dispatchedQty || 0);
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                          {ord.orderNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-900">{ord.customerName}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                            {ord.notes || 'As per customer profile'}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{ord.orderDate}</td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-900 font-medium">
                          {ord.totalQty} units
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums">
                          <span className="text-emerald-700 font-medium">{ord.dispatchedQty || 0}</span> /{' '}
                          <span className="text-amber-700 font-semibold">{remaining}</span> remaining
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={ord.status} type="order" />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleOpenDispatchForOrder(ord)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Record Dispatch</span>
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
      )}

      {/* Tab 2: Dispatched History */}
      {activeTab === 'dispatched' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          {filteredDispatches.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No dispatches found"
              description="No dispatch records match your search."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Dispatch #</th>
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Customer Destination</th>
                    <th className="py-2.5 px-3">Dispatch Date</th>
                    <th className="py-2.5 px-3">Carrier / Vehicle #</th>
                    <th className="py-2.5 px-3 text-right">Items Dispatched</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDispatches.map((dsp) => {
                    const totalItems = dsp.items.reduce((sum, it) => sum + it.quantityDispatched, 0);
                    return (
                      <tr key={dsp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                          {dsp.dispatchNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {dsp.orderNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[200px]">
                          {dsp.customerName}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                          {dsp.dispatchDate}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <p className="font-medium text-slate-900">{dsp.carrierName}</p>
                          <p className="text-[10px] font-mono text-slate-500">{dsp.vehicleOrTrackingNo}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                          {totalItems} units
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={dsp.status} type="dispatch" />
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingDispatch(dsp)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Inspect delivery challan"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {dsp.status !== 'delivered' && (
                              <button
                                onClick={() => handleMarkAsDelivered(dsp.id)}
                                className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                                title="Mark as delivered to retailer"
                              >
                                Mark Delivered
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
      )}

      {/* Record Dispatch Modal */}
      <Modal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        title="Record Warehouse Dispatch"
        subtitle={`Fulfilling sales order ${selectedOrderToDispatch?.orderNumber} for ${selectedOrderToDispatch?.customerName}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleConfirmDispatch} className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/70 rounded-md border border-blue-200 text-blue-900">
            <p className="font-semibold">Stock Deduction Execution:</p>
            <p className="text-[11px] mt-0.5">
              Confirming this dispatch will permanently deduct physical stock from inventory and release the reserved stock allocation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Carrier / Transport Agency *</label>
              <input
                type="text"
                required
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                placeholder="e.g. Jai Maharashtra Logistics"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Vehicle / Tracking Number *</label>
              <input
                type="text"
                required
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="e.g. MH-04-EK-4592"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          {/* Line items to dispatch */}
          <div className="border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3 text-right">Ordered Qty</th>
                  <th className="py-2 px-3 text-right w-28">Dispatch Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedOrderToDispatch?.items.map((it) => (
                  <tr key={it.productId}>
                    <td className="py-2 px-3">
                      <p className="font-medium text-slate-900">{it.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{it.sku}</p>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {it.quantity} {it.uom}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={it.quantity}
                        value={dispatchQuantities[it.productId] ?? it.quantity}
                        onChange={(e) =>
                          setDispatchQuantities({
                            ...dispatchQuantities,
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
              <label className="block font-medium text-slate-700 mb-1">Store / Warehouse Dispatcher *</label>
              <input
                type="text"
                required
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Dispatch Notes</label>
              <input
                type="text"
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="e.g. 4 cartons verified and sealed"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDispatchModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              Confirm Dispatch & Deduct Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* View Delivery Manifest & Dispatch Challan Modal */}
      <Modal
        isOpen={!!viewingDispatch}
        onClose={() => setViewingDispatch(null)}
        title={`Delivery Challan: ${viewingDispatch?.dispatchNumber}`}
        subtitle={`Order: ${viewingDispatch?.orderNumber} · Customer: ${viewingDispatch?.customerName}`}
        maxWidth="3xl"
      >
        {viewingDispatch && (
          <div className="space-y-4 text-xs">
            {/* Action Bar */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium">Status:</span>
                <StatusBadge status={viewingDispatch.status} type="dispatch" />
              </div>
              <div className="flex items-center gap-2">
                {viewingDispatch.status !== 'delivered' && (
                  <button
                    onClick={() => handleMarkAsDelivered(viewingDispatch.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
                  >
                    Confirm Delivery
                  </button>
                )}
                <button
                  onClick={handlePrintManifest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Challan</span>
                </button>
              </div>
            </div>

            {/* Printable Manifest Preview */}
            <div className="p-5 border border-slate-200 rounded-lg bg-white space-y-4 shadow-2xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-wide">DELIVERY CHALLAN</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Docket #{viewingDispatch.dispatchNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">StockFlow Wholesale Hub</p>
                  <p className="text-[11px] text-slate-500">APMC Market, Vashi, Navi Mumbai</p>
                  <p className="text-[10px] text-slate-400 font-mono">Date: {viewingDispatch.dispatchDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="font-semibold text-slate-700 mb-1">Consignee (Deliver To):</p>
                  <p className="font-bold text-slate-900">{viewingDispatch.customerName}</p>
                  <p className="text-slate-600 mt-1">{viewingDispatch.shippingAddress}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="font-semibold text-slate-700 mb-1">Transport Details:</p>
                  <p className="text-slate-800">
                    <span className="text-slate-400">Carrier:</span> {viewingDispatch.carrierName}
                  </p>
                  <p className="text-slate-800 font-mono">
                    <span className="text-slate-400 font-sans">Vehicle #:</span> {viewingDispatch.vehicleOrTrackingNo}
                  </p>
                  <p className="text-slate-800 font-mono">
                    <span className="text-slate-400 font-sans">Sales Order Ref:</span> {viewingDispatch.orderNumber}
                  </p>
                </div>
              </div>

              {/* Items Dispatched Table */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3 text-right">Dispatched Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingDispatch.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{it.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{it.sku}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                          {it.quantityDispatched} {it.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
                <div>
                  <div className="border-b border-slate-300 pb-8 mb-1"></div>
                  <p className="font-semibold text-slate-700">Warehouse Dispatcher Signature</p>
                  <p className="text-[10px] text-slate-400">Goods dispatched in sound condition</p>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-8 mb-1"></div>
                  <p className="font-semibold text-slate-700">Receiver's Seal & Signature</p>
                  <p className="text-[10px] text-slate-400">Received full count without damage</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingDispatch(null)}
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
