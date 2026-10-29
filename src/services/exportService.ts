/**
 * StockFlow Data Export Service
 * 
 * Provides professional XLSX and CSV exports for all business domains:
 * - Products & Inventory
 * - Commercial Parties (Customers & Suppliers)
 * - Sales Orders & Line Items
 * - Tax Invoices & Ledger Balances
 * - Payment Receipts & Allocations
 * - Supplier Purchases
 * - Audited Stock Movements
 * - Date-Filtered Sales & Collections Reports
 */

import * as XLSX from 'xlsx';
import { DbProduct, DbParty, DbSalesOrder, DbInvoice, DbPayment, DbPurchase, DbStockMovement } from '../types/database';

export type ExportFormat = 'xlsx' | 'csv';

export interface DateFilterRange {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

function sanitizeCell(val: any): string | number {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  const str = String(val);
  // Prevent spreadsheet formula injection (CSV/Excel command execution)
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    return `'${str}`;
  }
  return str;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportData(filename: string, headers: string[], rows: (string | number)[][], format: ExportFormat = 'xlsx') {
  const sanitizedRows = rows.map((r) => r.map(sanitizeCell));
  const dateStr = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${dateStr}.${format}`;

  if (format === 'csv') {
    // Generate RFC-4180 compliant CSV
    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...sanitizedRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, fullFilename);
  } else {
    // Generate XLSX workbook
    const worksheetData = [headers, ...sanitizedRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-fit column widths
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...sanitizedRows.map((r) => String(r[i] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, fullFilename);
  }
}

// 1. PRODUCTS & INVENTORY EXPORT
export function exportProducts(products: DbProduct[], format: ExportFormat = 'xlsx') {
  const headers = [
    'Product ID',
    'SKU',
    'Product Name',
    'Category',
    'UOM',
    'Physical Stock',
    'Reserved Stock',
    'Available Stock',
    'Purchase Cost (₹)',
    'Default Selling Price (₹)',
    'Inventory Value (₹)',
    'Reorder Level',
    'HSN Code',
    'GST Rate (%)',
    'Status'
  ];

  const rows = products.map((p) => {
    const curStock = p.current_stock || 0;
    const resStock = p.reserved_stock || 0;
    const availStock = Math.max(0, curStock - resStock);
    const valuation = Number((curStock * p.purchase_cost).toFixed(2));

    return [
      p.id,
      p.sku,
      p.name,
      p.category,
      p.uom,
      curStock,
      resStock,
      availStock,
      p.purchase_cost,
      p.default_selling_price,
      valuation,
      p.reorder_level,
      p.hsn_code || '',
      p.gst_rate,
      p.status
    ];
  });

  exportData('StockFlow_Products_Inventory', headers, rows, format);
}

// 2. COMMERCIAL PARTIES EXPORT
export function exportParties(
  parties: DbParty[] | any[],
  arg2?: string | ExportFormat,
  arg3?: ExportFormat
) {
  let fileCategory = 'Parties';
  let format: ExportFormat = 'xlsx';

  if (arg2 === 'xlsx' || arg2 === 'csv') {
    format = arg2;
  } else if (typeof arg2 === 'string') {
    fileCategory = arg2.charAt(0).toUpperCase() + arg2.slice(1);
    if (arg3 === 'xlsx' || arg3 === 'csv') format = arg3;
  }

  const headers = [
    'Party ID',
    'Party Code',
    'Business Name',
    'Type',
    'Contact Person',
    'Phone',
    'Email',
    'GSTIN',
    'PAN Number',
    'Payment Terms',
    'Credit Limit (₹)',
    'Opening Balance (₹)',
    'Current Outstanding Due (₹)',
    'Billing Address',
    'Status'
  ];

  const rows = parties.map((p) => [
    p.id,
    p.code || '',
    p.name,
    p.party_type || p.type || '',
    p.contact_person || p.contactPerson || '',
    p.phone || '',
    p.email || '',
    p.gstin || 'Unregistered',
    p.pan_number || '',
    p.payment_terms || p.paymentTerms || '',
    p.credit_limit ?? p.creditLimit ?? 0,
    p.opening_balance ?? p.openingBalance ?? 0,
    p.current_outstanding ?? p.outstanding_balance ?? 0,
    p.billing_address || p.billingAddress || '',
    p.status || 'active'
  ]);

  exportData(`StockFlow_${fileCategory}_Master`, headers, rows, format);
}

// 3. SALES ORDERS EXPORT
export function exportSalesOrders(orders: DbSalesOrder[], format: ExportFormat = 'xlsx') {
  const headers = [
    'Order ID',
    'Order Number',
    'Order Date',
    'Expected Delivery',
    'Customer Name',
    'Subtotal (₹)',
    'Discount Total (₹)',
    'Tax Total (₹)',
    'Grand Total (₹)',
    'Fulfillment Status',
    'Payment Status',
    'Notes'
  ];

  const rows = orders.map((o) => [
    o.id,
    o.order_number,
    o.order_date,
    o.expected_delivery_date || '',
    (o as any).customer?.name || 'Customer',
    o.subtotal,
    o.discount_total,
    o.tax_total,
    o.grand_total,
    o.status,
    o.payment_status,
    o.notes || ''
  ]);

  exportData('StockFlow_Sales_Orders', headers, rows, format);
}

// 4. INVOICES & LEDGER BALANCES EXPORT
export function exportInvoices(invoices: DbInvoice[], format: ExportFormat = 'xlsx') {
  const headers = [
    'Invoice ID',
    'Invoice Number',
    'Issue Date',
    'Due Date',
    'Customer Name',
    'Customer GSTIN',
    'Subtotal (₹)',
    'Discount (₹)',
    'GST Tax (₹)',
    'Grand Total (₹)',
    'Amount Paid (₹)',
    'Balance Due (₹)',
    'Status',
    'Payment Terms'
  ];

  const rows = invoices.map((i) => [
    i.id,
    i.invoice_number,
    i.issue_date,
    i.due_date,
    (i as any).customer?.name || 'Customer',
    i.customer_gstin || 'URP',
    i.subtotal,
    i.discount_total,
    i.tax_total,
    i.grand_total,
    i.total_paid || 0,
    i.balance_due ?? (i.grand_total - (i.total_paid || 0)),
    i.status,
    i.payment_terms
  ]);

  exportData('StockFlow_Tax_Invoices_Register', headers, rows, format);
}

// 5. PAYMENTS & ALLOCATIONS EXPORT
export function exportPayments(payments: DbPayment[], format: ExportFormat = 'xlsx') {
  const headers = [
    'Payment ID',
    'Receipt Number',
    'Payment Date',
    'Party Type',
    'Party Name',
    'Amount (₹)',
    'Payment Method',
    'Reference / UTR No',
    'Allocated Invoices',
    'Notes'
  ];

  const rows = payments.map((p) => {
    const allocStr = (p.allocations || [])
      .map((a) => `${(a as any).invoice?.invoice_number || 'INV'}: ₹${a.amount_allocated}`)
      .join('; ');

    return [
      p.id,
      p.payment_number,
      p.payment_date,
      p.party_type,
      (p as any).party?.name || 'Commercial Partner',
      p.amount,
      p.payment_method,
      p.reference_no || '',
      allocStr || 'Unallocated Advance',
      p.notes || ''
    ];
  });

  exportData('StockFlow_Payments_Register', headers, rows, format);
}

// 6. PURCHASES EXPORT
export function exportPurchases(purchases: DbPurchase[], format: ExportFormat = 'xlsx') {
  const headers = [
    'Purchase ID',
    'PO Number',
    'Order Date',
    'Expected Date',
    'Received Date',
    'Supplier Name',
    'Subtotal (₹)',
    'Tax Total (₹)',
    'Grand Total (₹)',
    'PO Status',
    'Payment Status'
  ];

  const rows = purchases.map((po) => [
    po.id,
    po.purchase_ref,
    po.order_date,
    po.expected_date || '',
    po.received_date || '',
    (po as any).supplier?.name || 'Supplier',
    po.subtotal,
    po.tax_total,
    po.grand_total,
    po.status,
    po.payment_status
  ]);

  exportData('StockFlow_Supplier_Purchases', headers, rows, format);
}

// 7. STOCK MOVEMENTS LEDGER EXPORT
export function exportStockMovements(
  movements: DbStockMovement[] | any[],
  arg2?: any,
  arg3?: ExportFormat
) {
  let format: ExportFormat = 'xlsx';
  if (arg2 === 'xlsx' || arg2 === 'csv') {
    format = arg2;
  } else if (arg3 === 'xlsx' || arg3 === 'csv') {
    format = arg3;
  }

  const productsMap = new Map<string, any>();
  if (Array.isArray(arg2)) {
    arg2.forEach((p) => productsMap.set(p.id, p));
  }

  const headers = [
    'Movement ID',
    'Timestamp',
    'Product SKU',
    'Product Name',
    'Movement Type',
    'Change Qty',
    'Previous Stock',
    'New Balance Stock',
    'Reference No',
    'Audit Reason'
  ];

  const rows = movements.map((m) => {
    const prod = productsMap.get(m.product_id || m.productId) || (m as any).product;
    return [
      m.id,
      m.created_at || m.timestamp || '',
      prod?.sku || '',
      prod?.name || '',
      m.movement_type || m.type || '',
      m.change_qty ?? m.quantity ?? 0,
      m.previous_stock ?? 0,
      m.new_stock ?? 0,
      m.reference_id || m.reference_type || '',
      m.reason || ''
    ];
  });

  exportData('StockFlow_Stock_Movements_Audit', headers, rows, format);
}

// 8. DATE-FILTERED SALES & COLLECTIONS REPORT
export function exportSalesAndCollectionsReport(
  arg1:
    | {
        invoices: DbInvoice[] | any[];
        payments: DbPayment[] | any[];
        dateRange: DateFilterRange;
        format?: ExportFormat;
      }
    | DbInvoice[]
    | any[],
  arg2?: DbPayment[] | any[],
  arg3?: DateFilterRange,
  arg4: ExportFormat = 'xlsx'
) {
  let invoices: any[];
  let payments: any[];
  let range: DateFilterRange;
  let format: ExportFormat = 'xlsx';

  if (arg1 && typeof arg1 === 'object' && 'invoices' in arg1) {
    invoices = arg1.invoices;
    payments = arg1.payments;
    range = arg1.dateRange || {};
    format = arg1.format || 'xlsx';
  } else {
    invoices = arg1 as any[];
    payments = arg2 as any[];
    range = arg3 || {};
    format = arg4;
  }

  // Apply date filters
  const filteredInvoices = invoices.filter((inv) => {
    const invDate = inv.issue_date || inv.issueDate || inv.created_at || '';
    if (range.startDate && invDate < range.startDate) return false;
    if (range.endDate && invDate > range.endDate) return false;
    return inv.status !== 'cancelled';
  });

  const filteredPayments = payments.filter((pay) => {
    const payDate = pay.payment_date || pay.paymentDate || pay.date || pay.created_at || '';
    if (range.startDate && payDate < range.startDate) return false;
    if (range.endDate && payDate > range.endDate) return false;
    return (pay.party_type || pay.partyType) === 'customer';
  });

  const headers = [
    'Document Type',
    'Reference No',
    'Date',
    'Party Name',
    'Invoiced Amount (₹)',
    'Collected Amount (₹)',
    'Status'
  ];

  const rows: (string | number)[][] = [];

  filteredInvoices.forEach((inv) => {
    rows.push([
      'Tax Invoice',
      inv.invoice_number,
      inv.issue_date,
      (inv as any).customer?.name || 'Customer',
      inv.grand_total,
      0,
      inv.status
    ]);
  });

  filteredPayments.forEach((pay) => {
    rows.push([
      'Payment Receipt',
      pay.payment_number,
      pay.payment_date,
      (pay as any).party?.name || 'Customer',
      0,
      pay.amount,
      pay.payment_method
    ]);
  });

  // Sort chronologically
  rows.sort((a, b) => String(b[2]).localeCompare(String(a[2])));

  exportData('StockFlow_Sales_Collections_Report', headers, rows, format);
}
