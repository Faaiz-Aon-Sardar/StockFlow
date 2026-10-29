import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isWithinDateRange,
  getDateRangePreset,
  generateComprehensiveReport,
} from '../services/reportsEngine.ts';
import {
  sanitizeCellForSpreadsheet,
  autoMapColumns,
  generateSampleTemplateRows,
  SUPPORTED_IMPORT_COLUMNS,
} from '../services/importService.ts';

describe('Reports Engine & Calculation Integrity', () => {
  const sampleProducts = [
    {
      id: 'p-1',
      business_id: 'biz-1',
      sku: 'SKU-001',
      name: 'Basmati Rice 25kg Bag',
      category: 'Grains',
      unit: 'bag',
      selling_price: 2400.0,
      purchase_price: 1900.0,
      current_stock: 50,
      min_stock_level: 10,
      tax_rate: 5,
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'p-2',
      business_id: 'biz-1',
      sku: 'SKU-002',
      name: 'Refined Oil 15L Tin',
      category: 'Edible Oils',
      unit: 'tin',
      selling_price: 1850.5,
      purchase_price: 1520.0,
      current_stock: 30,
      min_stock_level: 5,
      tax_rate: 5,
      created_at: '2026-10-01T10:00:00Z',
    },
  ];

  const sampleParties = [
    {
      id: 'cust-1',
      business_id: 'biz-1',
      code: 'CUST-01',
      name: 'Sharma Supermarket',
      type: 'customer' as const,
      phone: '+91 98200 11223',
      credit_limit: 100000,
      outstanding_balance: 24000,
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'supp-1',
      business_id: 'biz-1',
      code: 'SUPP-01',
      name: 'Punjab Agro Mills',
      type: 'supplier' as const,
      phone: '+91 98111 22334',
      outstanding_balance: 50000,
      created_at: '2026-10-01T10:00:00Z',
    },
  ];

  const sampleOrders = [
    {
      id: 'ord-1',
      order_number: 'SO-101',
      customer_id: 'cust-1',
      order_date: '2026-10-15',
      grand_total: 24000.0,
      status: 'confirmed' as const,
      payment_status: 'unpaid' as const,
      created_at: '2026-10-15T11:00:00Z',
      items: [
        {
          product_id: 'p-1',
          quantity: 10,
          unit_price: 2400.0,
          line_total: 24000.0,
        },
      ],
    },
    {
      id: 'ord-old',
      order_number: 'SO-090',
      customer_id: 'cust-1',
      order_date: '2026-08-10',
      grand_total: 5000.0,
      status: 'completed' as const,
      payment_status: 'paid' as const,
      created_at: '2026-08-10T11:00:00Z',
      items: [],
    },
  ];

  const sampleInvoices = [
    {
      id: 'inv-1',
      invoice_number: 'INV-2026-001',
      customer_id: 'cust-1',
      issue_date: '2026-10-16',
      due_date: '2026-10-31',
      total_amount: 24000.0,
      amount_paid: 10000.0,
      balance_due: 14000.0,
      status: 'partially_paid' as const,
      created_at: '2026-10-16T10:00:00Z',
    },
  ];

  const samplePayments = [
    {
      id: 'pay-1',
      payment_number: 'PAY-101',
      party_id: 'cust-1',
      party_type: 'customer' as const,
      amount: 10000.0,
      payment_date: '2026-10-20',
      created_at: '2026-10-20T14:00:00Z',
    },
  ];

  const samplePurchases = [
    {
      id: 'po-1',
      po_number: 'PO-201',
      supplier_id: 'supp-1',
      grand_total: 38000.0,
      paid_amount: 0,
      status: 'received' as const,
      payment_status: 'unpaid' as const,
      created_at: '2026-10-05T09:00:00Z',
    },
  ];

  const sampleMovements = [
    {
      id: 'sm-1',
      product_id: 'p-1',
      movement_type: 'purchase_in' as const,
      quantity: 50,
      created_at: '2026-10-05T12:00:00Z',
    },
    {
      id: 'sm-2',
      product_id: 'p-1',
      movement_type: 'sale_out' as const,
      quantity: 10,
      created_at: '2026-10-15T15:00:00Z',
    },
  ];

  it('filters date ranges accurately with edge-day inclusivity', () => {
    const range = { startDate: '2026-10-01', endDate: '2026-10-31' };
    assert.strictEqual(isWithinDateRange('2026-10-01T00:00:01Z', range), true);
    assert.strictEqual(isWithinDateRange('2026-10-15T12:00:00Z', range), true);
    assert.strictEqual(isWithinDateRange('2026-10-31T23:59:59Z', range), true);
    assert.strictEqual(isWithinDateRange('2026-09-30T23:59:59Z', range), false);
    assert.strictEqual(isWithinDateRange('2026-11-01T00:00:01Z', range), false);
  });

  it('computes order totals, invoiced totals, collections, and balances correctly', () => {
    const report = generateComprehensiveReport({
      dateRange: { startDate: '2026-10-01', endDate: '2026-10-31' },
      products: sampleProducts as any,
      parties: sampleParties as any,
      orders: sampleOrders as any,
      invoices: sampleInvoices as any,
      payments: samplePayments as any,
      purchases: samplePurchases as any,
      stockMovements: sampleMovements as any,
      costingMethod: 'fifo',
    });

    // Orders within October only: 24,000 (SO-090 from August excluded)
    assert.strictEqual(report.summary.orderTotal, 24000.0);
    assert.strictEqual(report.summary.orderCount, 1);

    // Invoices within October: 24,000
    assert.strictEqual(report.summary.invoicedTotal, 24000.0);
    assert.strictEqual(report.summary.invoicedCount, 1);

    // Collections within October: 10,000
    assert.strictEqual(report.summary.collectionsTotal, 10000.0);

    // Outstanding balance due from invoice: 14,000
    assert.strictEqual(report.summary.receivablesDue, 14000.0);

    // Purchases in October: 38,000
    assert.strictEqual(report.summary.purchasesTotal, 38000.0);

    // Costing method is explicitly identified as FIFO
    assert.strictEqual(report.costingMethod, 'fifo');

    // Gross profit: 10 units sold @ 2400 = 24,000 sales. Cost = 10 units @ 1900 = 19,000. Gross Profit = 5,000
    assert.strictEqual(report.summary.grossProfit, 5000.0);
    assert.strictEqual(report.summary.grossProfitMargin, 20.8); // 5000 / 24000 * 100 = 20.83%
  });

  it('calculates inventory asset valuation accurately', () => {
    const report = generateComprehensiveReport({
      dateRange: { startDate: '2026-10-01', endDate: '2026-10-31' },
      products: sampleProducts as any,
      parties: sampleParties as any,
      orders: sampleOrders as any,
      invoices: sampleInvoices as any,
      payments: samplePayments as any,
      purchases: samplePurchases as any,
      stockMovements: sampleMovements as any,
      costingMethod: 'fifo',
    });

    // Stock value: 50 * 1900 (95,000) + 30 * 1520 (45,600) = 140,600
    assert.strictEqual(report.summary.currentInventoryValue, 140600.0);
  });
});

describe('Spreadsheet Security & Formula Injection Neutralization', () => {
  it('neutralizes dangerous executable formula characters (=, +, -, @)', () => {
    assert.strictEqual(sanitizeCellForSpreadsheet('=cmd|"/c calc"!A0'), "'=cmd|\"/c calc\"!A0");
    assert.strictEqual(sanitizeCellForSpreadsheet('+12345'), "'+12345");
    assert.strictEqual(sanitizeCellForSpreadsheet('-SUM(A1:A10)'), "'-SUM(A1:A10)");
    assert.strictEqual(sanitizeCellForSpreadsheet('@SUM(B1:B10)'), "'@SUM(B1:B10)");
  });

  it('preserves clean numeric and safe string cells without altering', () => {
    assert.strictEqual(sanitizeCellForSpreadsheet(1500.5), 1500.5);
    assert.strictEqual(sanitizeCellForSpreadsheet('Basmati Rice'), 'Basmati Rice');
    assert.strictEqual(sanitizeCellForSpreadsheet(null), '');
    assert.strictEqual(sanitizeCellForSpreadsheet(undefined), '');
  });
});

describe('Spreadsheet Header Auto-Mapping & Column Matching', () => {
  it('correctly maps various common aliases to canonical fields for products', () => {
    const headers = ['Product Name', 'Item SKU', 'Cost Price', 'Selling Rate', 'Available Stock'];
    const mapping = autoMapColumns('products', headers);

    assert.strictEqual(mapping['Product Name'], 'name');
    assert.strictEqual(mapping['Item SKU'], 'sku');
    assert.strictEqual(mapping['Cost Price'], 'purchase_price');
    assert.strictEqual(mapping['Selling Rate'], 'selling_price');
    assert.strictEqual(mapping['Available Stock'], 'current_stock');
  });

  it('correctly maps customer aliases to canonical fields', () => {
    const headers = ['Party Name', 'Mobile Number', 'GST Number', 'Credit Limit'];
    const mapping = autoMapColumns('customers', headers);

    assert.strictEqual(mapping['Party Name'], 'name');
    assert.strictEqual(mapping['Mobile Number'], 'phone');
    assert.strictEqual(mapping['GST Number'], 'gstin');
    assert.strictEqual(mapping['Credit Limit'], 'credit_limit');
  });
});

describe('Sample Import Templates', () => {
  it('generates valid sample rows containing required schema columns for products', () => {
    const sampleRows = generateSampleTemplateRows('products');
    assert.ok(sampleRows.length > 0);
    assert.ok(sampleRows[0]['sku']);
    assert.ok(sampleRows[0]['name']);
    assert.ok(sampleRows[0]['selling_price'] > 0);
    assert.ok(SUPPORTED_IMPORT_COLUMNS.products.some((col) => col.key === 'sku' && col.required));
  });

  it('generates valid sample rows containing required schema columns for customers', () => {
    const sampleRows = generateSampleTemplateRows('customers');
    assert.ok(sampleRows.length > 0);
    assert.ok(sampleRows[0]['name']);
    assert.ok(sampleRows[0]['phone']);
    assert.ok(SUPPORTED_IMPORT_COLUMNS.customers.some((col) => col.key === 'name' && col.required));
  });
});
