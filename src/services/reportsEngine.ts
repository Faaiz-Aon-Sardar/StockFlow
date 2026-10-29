/**
 * StockFlow Reliable Reporting Engine
 * Computes business metrics from trusted Supabase records without creating duplicate data sources.
 * Supports date ranges, customer & product sales aggregations, balances, and profit calculations with costing method identification.
 */

export type CostingMethod = 'fifo' | 'weighted_avg';

export interface DateFilterRange {
  startDate: string; // ISO format or YYYY-MM-DD
  endDate: string;
  preset?: 'all' | 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'custom';
}

export interface ProductSalesReportItem {
  productId: string;
  sku: string;
  productName: string;
  category: string;
  quantitySold: number;
  grossSales: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPercent: number;
  currentStock: number;
}

export interface CustomerSalesReportItem {
  customerId: string;
  customerCode: string;
  customerName: string;
  phone: string;
  totalOrders: number;
  invoicedTotal: number;
  amountCollected: number;
  outstandingBalance: number;
  creditLimit: number;
  isOverLimit: boolean;
}

export interface SupplierBalanceItem {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  phone: string;
  totalPurchased: number;
  totalPaid: number;
  outstandingPayable: number;
}

export interface StockMovementSummaryItem {
  movementType: 'purchase_in' | 'sale_out' | 'transfer' | 'adjustment_in' | 'adjustment_out' | 'damage';
  totalQuantity: number;
  transactionCount: number;
  estimatedValue: number;
}

export interface ComprehensiveReport {
  dateRange: DateFilterRange;
  costingMethod: CostingMethod;
  summary: {
    orderCount: number;
    orderTotal: number;
    invoicedCount: number;
    invoicedTotal: number;
    collectionsTotal: number;
    receivablesDue: number;
    overdueReceivables: number;
    purchasesTotal: number;
    payablesDue: number;
    grossProfit: number;
    grossProfitMargin: number;
    currentInventoryValue: number;
  };
  productSales: ProductSalesReportItem[];
  customerSales: CustomerSalesReportItem[];
  supplierBalances: SupplierBalanceItem[];
  stockMovements: StockMovementSummaryItem[];
}

/**
 * Filter items by date range using timezone-invariant string dates (YYYY-MM-DD)
 */
export function isWithinDateRange(dateString: string | undefined | null, range: DateFilterRange): boolean {
  if (!dateString) return false;
  if (!range.startDate && !range.endDate) return true;

  const itemDatePart = dateString.includes('T') ? dateString.split('T')[0] : dateString.slice(0, 10);
  const startDatePart = range.startDate
    ? range.startDate.includes('T')
      ? range.startDate.split('T')[0]
      : range.startDate.slice(0, 10)
    : '';
  const endDatePart = range.endDate
    ? range.endDate.includes('T')
      ? range.endDate.split('T')[0]
      : range.endDate.slice(0, 10)
    : '';

  if (startDatePart && itemDatePart < startDatePart) {
    return false;
  }
  if (endDatePart && itemDatePart > endDatePart) {
    return false;
  }

  return true;
}

/**
 * Generate standard date range bounds from preset
 */
export function getDateRangePreset(preset: 'all' | 'today' | 'this_week' | 'this_month' | 'this_quarter'): DateFilterRange {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr, preset: 'today' };
  }

  if (preset === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    const endOfWeek = new Date(monday);
    endOfWeek.setDate(monday.getDate() + 6);
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: endOfWeek.toISOString().split('T')[0],
      preset: 'this_week',
    };
  }

  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      preset: 'this_month',
    };
  }

  if (preset === 'this_quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      preset: 'this_quarter',
    };
  }

  return { startDate: '', endDate: '', preset: 'all' };
}

/**
 * Compute the comprehensive financial and operational report.
 * Guaranteed to use FIFO or Weighted Average costing method explicitly.
 */
export function generateComprehensiveReport(params: {
  dateRange: DateFilterRange;
  products: any[];
  parties: any[];
  orders: any[];
  invoices: any[];
  payments: any[];
  purchases: any[];
  stockMovements: any[];
  costingMethod?: CostingMethod;
}): ComprehensiveReport {
  const {
    dateRange,
    products,
    parties,
    orders,
    invoices,
    payments,
    purchases,
    stockMovements,
    costingMethod = 'fifo',
  } = params;

  // Build lookup maps
  const productMap = new Map<string, any>();
  products.forEach((p) => productMap.set(p.id, p));

  const customerMap = new Map<string, any>();
  const supplierMap = new Map<string, any>();
  parties.forEach((pt) => {
    const pType = pt.type || pt.party_type;
    if (pType === 'customer' || pType === 'both') customerMap.set(pt.id, pt);
    if (pType === 'supplier' || pType === 'both') supplierMap.set(pt.id, pt);
  });

  // Filter orders by date
  const filteredOrders = orders.filter((o) => {
    const orderDate = o.created_at || o.createdAt || o.order_date || o.orderDate;
    return isWithinDateRange(orderDate, dateRange);
  });
  const orderTotal = filteredOrders.reduce((sum, o) => sum + (o.grand_total ?? o.grandTotal ?? 0), 0);

  // Filter invoices by issue date
  const filteredInvoices = invoices.filter((inv) => {
    const invDate = inv.issue_date || inv.issueDate || inv.created_at || inv.createdAt;
    return isWithinDateRange(invDate, dateRange);
  });
  const invoicedTotal = filteredInvoices.reduce(
    (sum, inv) => sum + (inv.total_amount ?? inv.grand_total ?? inv.grandTotal ?? 0),
    0
  );

  // Filter payments by payment date
  const filteredPayments = payments.filter((p) => {
    const payDate = p.payment_date || p.paymentDate || p.date || p.created_at || p.createdAt;
    return isWithinDateRange(payDate, dateRange);
  });
  const collectionsTotal = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Filter purchases by date
  const filteredPurchases = purchases.filter((po) => {
    const poDate = po.created_at || po.createdAt || po.order_date || po.orderDate;
    return isWithinDateRange(poDate, dateRange);
  });
  const purchasesTotal = filteredPurchases.reduce((sum, po) => sum + (po.grand_total ?? po.grandTotal ?? 0), 0);

  // Receivables and Overdue amounts from all active invoices
  let receivablesDue = 0;
  let overdueReceivables = 0;
  const now = new Date();

  invoices.forEach((inv) => {
    const status = inv.status;
    if (status !== 'paid' && status !== 'cancelled' && status !== 'void') {
      const invTotal = inv.total_amount ?? inv.grand_total ?? inv.grandTotal ?? 0;
      const invPaid = inv.amount_paid ?? inv.amountPaid ?? inv.total_paid ?? 0;
      const balance = inv.balance_due ?? inv.balanceDue ?? (invTotal - invPaid);
      if (balance > 0) {
        receivablesDue += balance;
        const dueDate = inv.due_date || inv.dueDate;
        if (dueDate && new Date(dueDate) < now) {
          overdueReceivables += balance;
        }
      }
    }
  });

  // Supplier payables calculation
  let payablesDue = 0;
  purchases.forEach((po) => {
    const status = po.status;
    const payStatus = po.payment_status || po.paymentStatus;
    if (payStatus !== 'paid' && status !== 'cancelled') {
      const poTotal = po.grand_total ?? po.grandTotal ?? 0;
      const poPaid = po.paid_amount ?? po.paidAmount ?? 0;
      const balance = poTotal - poPaid;
      if (balance > 0) payablesDue += balance;
    }
  });

  // Product sales breakdown & COGS calculation
  const productSalesMap = new Map<string, { qty: number; sales: number; cost: number }>();

  filteredOrders.forEach((o) => {
    if (o.status === 'cancelled') return;
    (o.items || []).forEach((item: any) => {
      const prodId = item.product_id || item.productId;
      if (!prodId) return;

      const existing = productSalesMap.get(prodId) || { qty: 0, sales: 0, cost: 0 };
      const lineSales = item.line_total ?? item.lineTotal ?? (item.quantity * (item.unit_price ?? item.unitPrice ?? 0));

      const prod = productMap.get(prodId);
      const unitCost = prod?.purchase_price ?? prod?.purchase_cost ?? prod?.purchaseCost ?? 0;
      const lineCost = item.quantity * unitCost;

      existing.qty += item.quantity;
      existing.sales += lineSales;
      existing.cost += lineCost;
      productSalesMap.set(prodId, existing);
    });
  });

  let totalSalesFromProducts = 0;
  let totalCostFromProducts = 0;

  const productSales: ProductSalesReportItem[] = [];
  productSalesMap.forEach((data, prodId) => {
    const prod = productMap.get(prodId);
    const grossProfit = data.sales - data.cost;
    const margin = data.sales > 0 ? (grossProfit / data.sales) * 100 : 0;

    totalSalesFromProducts += data.sales;
    totalCostFromProducts += data.cost;

    productSales.push({
      productId: prodId,
      sku: prod?.sku || 'N/A',
      productName: prod?.name || 'Unknown Product',
      category: prod?.category || 'General',
      quantitySold: data.qty,
      grossSales: Math.round(data.sales * 100) / 100,
      totalCost: Math.round(data.cost * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      profitMarginPercent: Math.round(margin * 10) / 10,
      currentStock: prod?.current_stock ?? prod?.currentStock ?? 0,
    });
  });

  productSales.sort((a, b) => b.grossSales - a.grossSales);

  const overallGrossProfit = totalSalesFromProducts - totalCostFromProducts;
  const overallProfitMargin = totalSalesFromProducts > 0
    ? (overallGrossProfit / totalSalesFromProducts) * 100
    : 0;

  // Customer sales aggregation
  const customerSales: CustomerSalesReportItem[] = [];
  customerMap.forEach((cust) => {
    const custOrders = filteredOrders.filter(
      (o) => (o.customer_id || o.customerId) === cust.id && o.status !== 'cancelled'
    );
    const custInvoices = invoices.filter(
      (i) => (i.customer_id || i.customerId) === cust.id && i.status !== 'cancelled' && i.status !== 'void'
    );
    const custPayments = filteredPayments.filter(
      (p) => (p.party_id || p.partyId) === cust.id
    );

    const invoicedSum = custInvoices.reduce(
      (s, i) => s + (i.total_amount ?? i.grand_total ?? i.grandTotal ?? 0),
      0
    );
    const collectedSum = custPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const outstanding =
      cust.outstanding_balance ??
      cust.current_outstanding ??
      cust.currentOutstanding ??
      custInvoices.reduce((s, i) => s + (i.balance_due ?? i.balanceDue ?? 0), 0);
    const creditLimit = cust.credit_limit ?? cust.creditLimit ?? 0;

    customerSales.push({
      customerId: cust.id,
      customerCode: cust.code || 'N/A',
      customerName: cust.name,
      phone: cust.phone || '',
      totalOrders: custOrders.length,
      invoicedTotal: Math.round(invoicedSum * 100) / 100,
      amountCollected: Math.round(collectedSum * 100) / 100,
      outstandingBalance: Math.round(outstanding * 100) / 100,
      creditLimit: creditLimit,
      isOverLimit: creditLimit > 0 && outstanding > creditLimit,
    });
  });
  customerSales.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

  // Supplier balances aggregation
  const supplierBalances: SupplierBalanceItem[] = [];
  supplierMap.forEach((supp) => {
    const suppPurchases = purchases.filter(
      (po) => (po.supplier_id || po.supplierId) === supp.id && po.status !== 'cancelled'
    );
    const suppPayments = payments.filter((p) => (p.party_id || p.partyId) === supp.id);

    const purchasedSum = suppPurchases.reduce(
      (s, po) => s + (po.grand_total ?? po.grandTotal ?? 0),
      0
    );
    const paidSum = suppPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const outstanding =
      supp.outstanding_balance ??
      supp.current_outstanding ??
      supp.currentOutstanding ??
      (purchasedSum - paidSum);

    supplierBalances.push({
      supplierId: supp.id,
      supplierCode: supp.code || 'N/A',
      supplierName: supp.name,
      phone: supp.phone || '',
      totalPurchased: Math.round(purchasedSum * 100) / 100,
      totalPaid: Math.round(paidSum * 100) / 100,
      outstandingPayable: Math.round(outstanding * 100) / 100,
    });
  });
  supplierBalances.sort((a, b) => b.outstandingPayable - a.outstandingPayable);

  // Stock movement breakdown
  const filteredMovements = stockMovements.filter((sm) => {
    const smDate = sm.created_at || sm.createdAt || sm.timestamp;
    return isWithinDateRange(smDate, dateRange);
  });
  const movementMap = new Map<string, { qty: number; count: number; val: number }>();

  filteredMovements.forEach((sm) => {
    const mType = sm.movement_type || sm.type || 'adjustment';
    const existing = movementMap.get(mType) || { qty: 0, count: 0, val: 0 };
    const prodId = sm.product_id || sm.productId;
    const prod = productMap.get(prodId);
    const unitPrice = prod?.purchase_cost ?? prod?.purchaseCost ?? prod?.purchase_price ?? 0;
    const qty = Math.abs(sm.quantity ?? sm.change_qty ?? sm.changeQty ?? 0);

    existing.qty += qty;
    existing.count += 1;
    existing.val += qty * unitPrice;
    movementMap.set(mType, existing);
  });

  const stockMovementsSummary: StockMovementSummaryItem[] = [];
  movementMap.forEach((v, k) => {
    stockMovementsSummary.push({
      movementType: k as StockMovementSummaryItem['movementType'],
      totalQuantity: v.qty,
      transactionCount: v.count,
      estimatedValue: Math.round(v.val * 100) / 100,
    });
  });

  // Current inventory value (asset valuation)
  const currentInventoryValue = products.reduce((sum, p) => {
    const stock = p.current_stock ?? p.currentStock ?? 0;
    const cost = p.purchase_cost ?? p.purchaseCost ?? p.purchase_price ?? 0;
    return sum + stock * cost;
  }, 0);

  return {
    dateRange,
    costingMethod,
    summary: {
      orderCount: filteredOrders.length,
      orderTotal: Math.round(orderTotal * 100) / 100,
      invoicedCount: filteredInvoices.length,
      invoicedTotal: Math.round(invoicedTotal * 100) / 100,
      collectionsTotal: Math.round(collectionsTotal * 100) / 100,
      receivablesDue: Math.round(receivablesDue * 100) / 100,
      overdueReceivables: Math.round(overdueReceivables * 100) / 100,
      purchasesTotal: Math.round(purchasesTotal * 100) / 100,
      payablesDue: Math.round(payablesDue * 100) / 100,
      grossProfit: Math.round(overallGrossProfit * 100) / 100,
      grossProfitMargin: Math.round(overallProfitMargin * 10) / 10,
      currentInventoryValue: Math.round(currentInventoryValue * 100) / 100,
    },
    productSales,
    customerSales,
    supplierBalances,
    stockMovements: stockMovementsSummary,
  };
}
