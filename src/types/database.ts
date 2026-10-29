/**
 * StockFlow Database Schema Types
 * Direct mappings to the PostgreSQL tables defined in supabase/migrations/
 */

export type UserRole = 'owner' | 'admin' | 'sales' | 'store' | 'accounts';
export type PaymentTerms = 'immediate' | 'net_7' | 'net_15' | 'net_30' | 'net_45' | 'net_60';
export type ValuationMethod = 'fifo' | 'weighted_avg';
export type UnitOfMeasure = 'pcs' | 'box' | 'crate' | 'kg' | 'ltr' | 'bag' | 'carton';
export type PartyType = 'customer' | 'supplier' | 'both';
export type OrderStatus = 'draft' | 'confirmed' | 'partially_dispatched' | 'dispatched' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type DispatchStatus = 'packed' | 'in_transit' | 'delivered';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque';
export type PurchaseStatus = 'ordered' | 'partially_received' | 'received' | 'cancelled';
export type StockMovementType = 'purchase_receipt' | 'dispatch' | 'adjustment' | 'return' | 'reservation_hold' | 'reservation_release';

export interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DbBusiness {
  id: string;
  name: string;
  trade_name?: string;
  gstin?: string;
  pan_number?: string;
  email?: string;
  phone?: string;
  website?: string;
  address: string;
  state: string;
  state_code: string;
  bank_name?: string;
  account_no?: string;
  ifsc_code?: string;
  branch_name?: string;
  upi_id?: string;
  currency_code: string;
  currency_symbol: string;
  default_payment_terms: PaymentTerms;
  invoice_prefix: string;
  order_prefix: string;
  purchase_prefix: string;
  dispatch_prefix: string;
  payment_prefix: string;
  valuation_method: ValuationMethod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  business?: DbBusiness;
  profile?: DbProfile;
}

export interface WholesaleTier {
  minQty: number;
  unitPrice: number;
}

export interface DbProduct {
  id: string;
  business_id: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  uom: UnitOfMeasure;
  purchase_cost: number;
  default_selling_price: number;
  reorder_level: number;
  hsn_code?: string;
  gst_rate: number;
  wholesale_tiers: WholesaleTier[];
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  // Dynamic balance computed from ledger / views
  current_stock?: number;
  reserved_stock?: number;
}

export interface DbParty {
  id: string;
  business_id: string;
  code: string;
  name: string;
  party_type: PartyType;
  contact_person?: string;
  phone: string;
  email?: string;
  billing_address?: string;
  shipping_address?: string;
  gstin?: string;
  pan_number?: string;
  payment_terms: PaymentTerms;
  credit_limit: number;
  opening_balance: number;
  notes?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  // Computed dynamic balance
  current_outstanding?: number;
}

export interface DbSalesOrder {
  id: string;
  business_id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  expected_delivery_date?: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer?: DbParty;
  items?: DbSalesOrderItem[];
}

export interface DbSalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  uom: UnitOfMeasure;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  hsn_code?: string;
  created_at: string;
}

export interface DbDispatch {
  id: string;
  business_id: string;
  dispatch_number: string;
  order_id: string;
  customer_id: string;
  dispatch_date: string;
  carrier_name: string;
  vehicle_or_tracking_no: string;
  shipping_address: string;
  status: DispatchStatus;
  notes?: string;
  dispatched_by?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  order?: DbSalesOrder;
  customer?: DbParty;
  items?: DbDispatchItem[];
}

export interface DbDispatchItem {
  id: string;
  dispatch_id: string;
  order_item_id?: string;
  product_id: string;
  quantity_dispatched: number;
  created_at: string;
  // Joined fields
  product?: DbProduct;
}

export interface TaxBreakdown {
  rate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface DbInvoice {
  id: string;
  business_id: string;
  invoice_number: string;
  order_id?: string;
  customer_id: string;
  billing_address: string;
  shipping_address: string;
  customer_gstin?: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount_total: number;
  tax_breakdown: TaxBreakdown[];
  tax_total: number;
  grand_total: number;
  status: InvoiceStatus;
  payment_terms: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields from view / allocations
  total_paid?: number;
  balance_due?: number;
  customer?: DbParty;
  items?: DbInvoiceItem[];
}

export interface DbInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  description?: string;
  uom: UnitOfMeasure;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  hsn_code?: string;
  created_at: string;
}

export interface DbPayment {
  id: string;
  business_id: string;
  payment_number: string;
  payment_date: string;
  party_type: 'customer' | 'supplier';
  party_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_no?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  party?: DbParty;
  allocations?: DbPaymentAllocation[];
}

export interface DbPaymentAllocation {
  id: string;
  business_id: string;
  payment_id: string;
  invoice_id: string;
  amount_allocated: number;
  created_at: string;
  invoice?: DbInvoice;
}

export interface DbPurchase {
  id: string;
  business_id: string;
  purchase_ref: string;
  supplier_id: string;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  status: PurchaseStatus;
  payment_status: PaymentStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  supplier?: DbParty;
  items?: DbPurchaseItem[];
}

export interface DbPurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  uom: UnitOfMeasure;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  hsn_code?: string;
  created_at: string;
}

export interface DbStockMovement {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: StockMovementType;
  change_qty: number;
  previous_stock: number;
  new_stock: number;
  unit_cost?: number;
  reason: string;
  reference_id?: string;
  reference_type?: string;
  reference_uuid?: string;
  performed_by?: string;
  created_at: string;
  product?: DbProduct;
}

export interface DbAuditLog {
  id: string;
  business_id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  changed_by?: string;
  created_at: string;
}
