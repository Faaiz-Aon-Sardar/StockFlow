/**
 * StockFlow Wholesale & Distribution Domain Types
 */

export type UnitOfMeasure = 'pcs' | 'box' | 'crate' | 'kg' | 'ltr' | 'bag' | 'carton';

export interface WholesaleTier {
  minQty: number;
  unitPrice: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  uom: UnitOfMeasure;
  purchaseCost: number;
  defaultSellingPrice: number;
  wholesaleTiers: WholesaleTier[];
  currentStock: number;
  reservedStock: number;
  reorderLevel: number;
  hsnCode: string;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'purchase_receipt' | 'dispatch' | 'adjustment' | 'return';

export interface StockMovement {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockMovementType;
  changeQty: number; // positive for addition, negative for reduction
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId?: string; // e.g. PO-1001, DSP-2001, ADJ-001
  operator: string;
}

export type PaymentTerms = 'immediate' | 'net_7' | 'net_15' | 'net_30' | 'net_45' | 'net_60';

export interface Customer {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  gstin?: string;
  paymentTerms: PaymentTerms;
  creditLimit: number;
  openingBalance: number;
  currentOutstanding: number;
  notes?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  paymentTerms: PaymentTerms;
  openingBalance: number;
  currentOutstanding: number;
  notes?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  uom: UnitOfMeasure;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number; // GST %
  taxAmount: number;
  lineTotal: number;
  hsnCode: string;
}

export type OrderStatus = 'draft' | 'confirmed' | 'partially_dispatched' | 'dispatched' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  orderDate: string;
  expectedDeliveryDate: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  dispatchedQty: number;
  totalQty: number;
  notes?: string;
  createdAt: string;
}

export interface DispatchItem {
  productId: string;
  sku: string;
  name: string;
  uom: UnitOfMeasure;
  quantityOrdered: number;
  quantityDispatched: number;
}

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  shippingAddress: string;
  dispatchDate: string;
  carrierName: string;
  vehicleOrTrackingNo: string;
  items: DispatchItem[];
  status: 'packed' | 'in_transit' | 'delivered';
  notes?: string;
  createdAt: string;
}

export interface TaxBreakdown {
  rate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  billingAddress: string;
  shippingAddress: string;
  issueDate: string;
  dueDate: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  taxBreakdown: TaxBreakdown[];
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  paymentTerms: string;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque';

export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  amountAllocated: number;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  date: string;
  partyType: 'customer' | 'supplier';
  partyId: string;
  partyName: string;
  amount: number;
  method: PaymentMethod;
  referenceNo?: string;
  allocations: PaymentAllocation[];
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  sku: string;
  name: string;
  uom: UnitOfMeasure;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  hsnCode: string;
}

export type PurchaseStatus = 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  purchaseRef: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  items: PurchaseItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
}

export type StaffRole = 'owner' | 'admin' | 'sales' | 'store' | 'accounts';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  department: string;
  avatarUrl?: string;
}

export interface BusinessSettings {
  companyName: string;
  tradeName: string;
  gstin: string;
  panNumber: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  state: string;
  stateCode: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  currencySymbol: string;
  currencyCode: string;
  defaultPaymentTerms: PaymentTerms;
  invoicePrefix: string;
  orderPrefix: string;
  purchasePrefix: string;
  dispatchPrefix: string;
  paymentPrefix: string;
  valuationMethod: 'fifo' | 'weighted_avg';
}
