import React, { useState } from 'react';
import {
  Search,
  Plus,
  ShoppingCart,
  Send,
  Eye,
  Trash2,
  Receipt,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  Edit2,
  XCircle,
  FileCheck
} from 'lucide-react';
import { SalesOrder, OrderItem, Customer, Product, OrderStatus } from '../types';
import { storage, formatINR, calculateLineItem, computeTaxBreakdown } from '../services/storage';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageId } from '../components/layout/Sidebar';

interface SalesOrdersPageProps {
  onNavigate: (page: PageId) => void;
}

export const SalesOrdersPage: React.FC<SalesOrdersPageProps> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<SalesOrder[]>(storage.getOrders());
  const [customers] = useState<Customer[]>(storage.getCustomers());
  const [products] = useState<Product[]>(storage.getProducts());

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [orderDate, setOrderDate] = useState<string>('2026-10-27');
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-10-29');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const reloadData = () => {
    setOrders(storage.getOrders());
  };

  const handleOpenCreate = () => {
    setEditingOrderId(null);
    const firstP = products[0];
    const calc = calculateLineItem({
      quantity: 12,
      unitPrice: firstP?.defaultSellingPrice || 100,
      discountPercent: 0,
      taxRate: firstP?.gstRate || 5
    });

    setOrderItems([
      {
        productId: firstP?.id || '',
        sku: firstP?.sku || '',
        name: firstP?.name || '',
        uom: firstP?.uom || 'pcs',
        quantity: 12,
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
    setOrderDate('2026-10-27');
    setDeliveryDate('2026-10-29');
    setOrderNotes('');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (ord: SalesOrder) => {
    setEditingOrderId(ord.id);
    setSelectedCustomerId(ord.customerId);
    setOrderDate(ord.orderDate);
    setDeliveryDate(ord.expectedDeliveryDate);
    setOrderNotes(ord.notes || '');
    setOrderItems([...ord.items]);
    setShowCreateModal(true);
  };

  const handleItemProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;

    const newItems = [...orderItems];
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

    setOrderItems(newItems);
  };

  const handleItemQuantityChange = (index: number, newQty: number) => {
    const newItems = [...orderItems];
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

    setOrderItems(newItems);
  };

  const handleItemDiscountChange = (index: number, discountPct: number) => {
    const newItems = [...orderItems];
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

    setOrderItems(newItems);
  };

  const handleAddItemRow = () => {
    const prod = products[0];
    const calc = calculateLineItem({
      quantity: 10,
      unitPrice: prod.defaultSellingPrice,
      discountPercent: 0,
      taxRate: prod.gstRate
    });

    setOrderItems([
      ...orderItems,
      {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        uom: prod.uom,
        quantity: 10,
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
    if (orderItems.length === 1) return;
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Computations for active form
  const formSubtotal = orderItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const formDiscountTotal = orderItems.reduce((sum, it) => sum + it.discountAmount, 0);
  const formTaxTotal = orderItems.reduce((sum, it) => sum + it.taxAmount, 0);
  const formGrandTotal = orderItems.reduce((sum, it) => sum + it.lineTotal, 0);

  const handleSaveOrder = (status: OrderStatus) => {
    if (orderItems.length === 0) return;

    storage.saveOrder({
      id: editingOrderId || undefined,
      customerId: selectedCustomerId,
      orderDate,
      expectedDeliveryDate: deliveryDate,
      items: orderItems,
      subtotal: formSubtotal,
      discountTotal: formDiscountTotal,
      taxTotal: formTaxTotal,
      grandTotal: formGrandTotal,
      status,
      notes: orderNotes
    });

    reloadData();
    setShowCreateModal(false);
    setFeedbackMessage({
      text: editingOrderId ? 'Sales order updated successfully!' : `Order successfully ${status === 'confirmed' ? 'confirmed & stock reserved' : 'saved as draft'}!`,
      type: 'success'
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleUpdateOrderStatus = (order: SalesOrder, newStatus: OrderStatus) => {
    storage.saveOrder({
      ...order,
      status: newStatus
    });
    reloadData();
    if (viewingOrder && viewingOrder.id === order.id) {
      setViewingOrder({ ...order, status: newStatus });
    }
  };

  const handleCancelOrder = (order: SalesOrder) => {
    if (order.status === 'dispatched' || order.status === 'delivered') {
      alert('Cannot cancel an order that has already been dispatched. Process a return instead.');
      return;
    }

    if (window.confirm(`Are you sure you want to cancel order ${order.orderNumber}? Any reserved stock will be returned to available inventory.`)) {
      storage.saveOrder({
        ...order,
        status: 'cancelled'
      });
      reloadData();
      if (viewingOrder && viewingOrder.id === order.id) {
        setViewingOrder({ ...order, status: 'cancelled' });
      }
      setFeedbackMessage({
        text: `Order ${order.orderNumber} cancelled and reserved inventory released.`,
        type: 'success'
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleDeleteDraft = (order: SalesOrder) => {
    if (order.status !== 'draft') {
      alert('Only draft orders can be deleted. Cancel confirmed orders to release reservations.');
      return;
    }

    if (window.confirm(`Delete draft order ${order.orderNumber}?`)) {
      try {
        storage.deleteOrder(order.id);
        if (viewingOrder?.id === order.id) {
          setViewingOrder(null);
        }
        reloadData();
      } catch (err: any) {
        alert(err.message || 'Error deleting order');
      }
    }
  };

  // Generate official tax invoice from confirmed/dispatched order
  const handleGenerateInvoice = (order: SalesOrder) => {
    const cust = customers.find((c) => c.id === order.customerId);
    const taxBreakdown = computeTaxBreakdown(order.items, false);

    storage.saveInvoice({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerGstin: order.customerGstin,
      billingAddress: cust?.billingAddress || 'Billing address on file',
      shippingAddress: cust?.shippingAddress || 'Shipping address on file',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: order.expectedDeliveryDate,
      items: order.items,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxBreakdown,
      taxTotal: order.taxTotal,
      grandTotal: order.grandTotal,
      status: 'issued',
      paymentTerms: cust ? cust.paymentTerms.replace('_', ' ') : 'Net 15',
      notes: `Generated against confirmed sales order ${order.orderNumber}`
    });

    onNavigate('invoices');
  };

  // Filtered orders
  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesCustomer = customerFilter === 'all' || o.customerId === customerFilter;

    return matchesSearch && matchesStatus && matchesCustomer;
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
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
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
              placeholder="Search by order number or customer store..."
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
            <span>Create Sales Order</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-slate-400 font-medium mr-1 shrink-0">Status:</span>
            {['all', 'draft', 'confirmed', 'partially_dispatched', 'dispatched', 'delivered', 'cancelled'].map(
              (st) => (
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
              )
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400 font-medium">Customer:</span>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-700"
            >
              <option value="all">All Retailers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No sales orders found"
            description="No customer booking records match your filter criteria."
            actionLabel="Create Sales Order"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Order Number</th>
                  <th className="py-2.5 px-3">Customer Store</th>
                  <th className="py-2.5 px-3">Date & Delivery</th>
                  <th className="py-2.5 px-3">Items Qty</th>
                  <th className="py-2.5 px-3">Order Status</th>
                  <th className="py-2.5 px-3">Payment Status</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {ord.orderNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {ord.customerName}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {ord.customerGstin || 'No GSTIN'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <p className="text-slate-800">{ord.orderDate}</p>
                      <p className="text-[10px] text-slate-400">Due: {ord.expectedDeliveryDate}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                      {ord.totalQty} units ({ord.items.length} lines)
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={ord.status} type="order" />
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={ord.paymentStatus} type="payment" />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatINR(ord.grandTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingOrder(ord)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Inspect order details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {ord.status === 'draft' && (
                          <button
                            onClick={() => handleOpenEdit(ord)}
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Edit draft order"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {ord.status === 'confirmed' && (
                          <button
                            onClick={() => onNavigate('dispatches')}
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Go to Dispatches to fulfill"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(ord.status === 'confirmed' || ord.status === 'dispatched') && (
                          <button
                            onClick={() => handleGenerateInvoice(ord)}
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Generate official Tax Invoice"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(ord.status === 'draft' || ord.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancelOrder(ord)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Cancel order & release reserved stock"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {ord.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteDraft(ord)}
                            className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Delete draft order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Order Details Modal */}
      <Modal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        title={`Sales Order: ${viewingOrder?.orderNumber}`}
        subtitle={`Booked for ${viewingOrder?.customerName} on ${viewingOrder?.orderDate}`}
        maxWidth="3xl"
      >
        {viewingOrder && (
          <div className="space-y-4 text-xs">
            {/* Status & Quick Action Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">Processing Status</span>
                  <StatusBadge status={viewingOrder.status} type="order" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment Status</span>
                  <StatusBadge status={viewingOrder.paymentStatus} type="payment" />
                </div>
              </div>

              {/* Status transition controls */}
              <div className="flex items-center gap-1.5">
                {viewingOrder.status === 'draft' && (
                  <>
                    <button
                      onClick={() => {
                        setViewingOrder(null);
                        handleOpenEdit(viewingOrder);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs"
                    >
                      Edit Items
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(viewingOrder, 'confirmed')}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                    >
                      Confirm & Reserve Stock
                    </button>
                  </>
                )}
                {viewingOrder.status === 'confirmed' && (
                  <button
                    onClick={() => {
                      setViewingOrder(null);
                      onNavigate('dispatches');
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded shadow-xs"
                  >
                    Fulfill in Dispatches →
                  </button>
                )}
                {(viewingOrder.status === 'confirmed' || viewingOrder.status === 'dispatched') && (
                  <button
                    onClick={() => handleGenerateInvoice(viewingOrder)}
                    className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                  >
                    Generate Tax Invoice
                  </button>
                )}
                {(viewingOrder.status === 'draft' || viewingOrder.status === 'confirmed') && (
                  <button
                    onClick={() => handleCancelOrder(viewingOrder)}
                    className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Item / SKU</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Disc. %</th>
                    <th className="py-2 px-3 text-right">GST %</th>
                    <th className="py-2 px-3 text-right">Tax</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingOrder.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <p className="font-semibold text-slate-900">{it.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {it.sku} · HSN: {it.hsnCode}
                        </p>
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {it.quantity} {it.uom}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatINR(it.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {it.discountPercent}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {it.taxRate}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatINR(it.taxAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatINR(it.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono tabular-nums">{formatINR(viewingOrder.subtotal)}</span>
                </div>
                {viewingOrder.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span className="font-mono tabular-nums">-{formatINR(viewingOrder.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Total GST:</span>
                  <span className="font-mono tabular-nums">{formatINR(viewingOrder.taxTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono tabular-nums">{formatINR(viewingOrder.grandTotal)}</span>
                </div>
              </div>
            </div>

            {viewingOrder.notes && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-700">Notes: </span>
                {viewingOrder.notes}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingOrder(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Sales Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingOrderId ? 'Edit Draft Sales Order' : 'Book Wholesale Sales Order'}
        subtitle="Specify products, apply automated volume tiers, and configure delivery terms"
        maxWidth="3xl"
      >
        <div className="space-y-4 text-xs">
          {/* Header row: Customer & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer Store *</label>
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
              <label className="block font-medium text-slate-700 mb-1">Order Date *</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Expected Delivery *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          {/* Line items builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Order Line Items ({orderItems.length})</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Line</span>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {orderItems.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                const availableStock = prod ? prod.currentStock - prod.reservedStock : 0;
                const isOverStock = item.quantity > availableStock;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-md border space-y-2 transition-colors ${
                      isOverStock ? 'bg-amber-50/40 border-amber-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Product Selector */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Product Item</label>
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

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          Quantity ({item.uom})
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleItemQuantityChange(idx, Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-right bg-white"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          disabled
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-right bg-slate-100 text-slate-600"
                        />
                      </div>

                      {/* Discount % */}
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

                      {/* Line Total */}
                      <div className="sm:col-span-2 text-right">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Total (inc. GST)</label>
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {formatINR(item.lineTotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={orderItems.length === 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                            title="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stock availability indicator & warning */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-mono">
                        HSN: {item.hsnCode} · GST: {item.taxRate}% (₹{item.taxAmount.toFixed(2)})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">
                          Available: <strong className="font-mono text-slate-800">{availableStock} {item.uom}</strong>
                        </span>
                        {isOverStock && (
                          <span className="text-amber-700 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Exceeds available stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes and Grand Total Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Booking Notes & Instructions</label>
              <textarea
                rows={3}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Deliver before 11 AM via shop front gate, verify batch dates"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1.5 text-xs self-start">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums">{formatINR(formSubtotal)}</span>
              </div>
              {formDiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Discount:</span>
                  <span className="font-mono tabular-nums">-{formatINR(formDiscountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Estimated GST:</span>
                <span className="font-mono tabular-nums">{formatINR(formTaxTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono tabular-nums">{formatINR(formGrandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveOrder('draft')}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSaveOrder('confirmed')}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              Confirm & Reserve Stock
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
