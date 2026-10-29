/**
 * StockFlow Domain Validation Schemas (Zod)
 * Validates user input prior to database submission and mirrors PostgreSQL constraints.
 */

import { z } from 'zod';

// Indian GSTIN regex pattern (15 alphanumeric characters: 2 state digits, 10 PAN, 1 entity, 1 Z, 1 checksum)
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Wholesale Pricing Tier
export const wholesaleTierSchema = z.object({
  minQty: z.number().int().positive('Minimum quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Tier unit price must be non-negative')
});

// 1. PRODUCT SCHEMA
export const productSchema = z.object({
  sku: z.string().trim().min(2, 'SKU must be at least 2 characters').toUpperCase(),
  name: z.string().trim().min(3, 'Product name must be at least 3 characters'),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().optional().default(''),
  uom: z.enum(['pcs', 'box', 'crate', 'kg', 'ltr', 'bag', 'carton']),
  purchase_cost: z.number().nonnegative('Purchase cost must be non-negative'),
  default_selling_price: z.number().nonnegative('Selling price must be non-negative'),
  reorder_level: z.number().nonnegative('Reorder level must be non-negative'),
  hsn_code: z.string().trim().regex(/^\d{2,8}$/, 'HSN code must be 2 to 8 digits').optional().or(z.literal('')),
  gst_rate: z.number().refine((val) => [0, 0.1, 0.25, 3, 5, 12, 18, 28].includes(val), {
    message: 'Invalid GST slab. Must be 0, 0.1, 0.25, 3, 5, 12, 18, or 28%'
  }),
  wholesale_tiers: z.array(wholesaleTierSchema).default([]),
  status: z.enum(['active', 'archived']).default('active')
});

export type ProductInput = z.infer<typeof productSchema>;

// 2. PARTY SCHEMA (Customer / Supplier)
export const partySchema = z.object({
  code: z.string().trim().min(1, 'Party code is required').toUpperCase(),
  name: z.string().trim().min(2, 'Party name must be at least 2 characters'),
  party_type: z.enum(['customer', 'supplier', 'both']),
  contact_person: z.string().optional().default(''),
  phone: z.string().trim().min(10, 'Valid 10-digit phone number is required'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  billing_address: z.string().optional().default(''),
  shipping_address: z.string().optional().default(''),
  gstin: z.string().trim().toUpperCase()
    .regex(GSTIN_REGEX, 'Invalid GSTIN format (e.g. 27AABCS1429B1Z8)')
    .optional()
    .or(z.literal('')),
  pan_number: z.string().trim().toUpperCase()
    .regex(PAN_REGEX, 'Invalid PAN format (e.g. AABCS1429B)')
    .optional()
    .or(z.literal('')),
  payment_terms: z.enum(['immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60']).default('net_15'),
  credit_limit: z.number().nonnegative('Credit limit must be non-negative').default(0),
  opening_balance: z.number().default(0),
  notes: z.string().optional().default(''),
  status: z.enum(['active', 'archived']).default('active')
});

export type PartyInput = z.infer<typeof partySchema>;

// 3. SALES ORDER ITEM SCHEMA
export const salesOrderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product reference'),
  product_sku: z.string(),
  product_name: z.string(),
  uom: z.string(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit_price: z.number().nonnegative('Price cannot be negative'),
  discount_percent: z.number().min(0).max(100, 'Discount percentage cannot exceed 100%').default(0),
  tax_rate: z.number().default(0),
  hsn_code: z.string().optional()
});

// 4. SALES ORDER SCHEMA
export const salesOrderSchema = z.object({
  customer_id: z.string().uuid('Customer selection is required'),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date required'),
  expected_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  items: z.array(salesOrderItemSchema).min(1, 'Order must contain at least one product item'),
  status: z.enum(['draft', 'confirmed', 'partially_dispatched', 'dispatched', 'delivered', 'cancelled']).default('draft'),
  notes: z.string().optional().default('')
});

export type SalesOrderInput = z.infer<typeof salesOrderSchema>;

// 5. DISPATCH SCHEMA
export const dispatchItemInputSchema = z.object({
  product_id: z.string().uuid(),
  quantity_dispatched: z.number().positive('Dispatch quantity must be greater than zero')
});

export const dispatchSchema = z.object({
  order_id: z.string().uuid('Order reference is required'),
  carrier_name: z.string().trim().min(2, 'Carrier / Transporter name is required'),
  vehicle_or_tracking_no: z.string().trim().min(2, 'Vehicle registration or Tracking number is required'),
  items: z.array(dispatchItemInputSchema).min(1, 'At least one item must be dispatched'),
  shipping_address: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

export type DispatchInput = z.infer<typeof dispatchSchema>;

// 6. PAYMENT ALLOCATION & ENTRY SCHEMA
export const paymentAllocationSchema = z.object({
  invoice_id: z.string().uuid('Invoice reference required'),
  amount_allocated: z.number().positive('Allocation amount must be greater than zero')
});

export const paymentSchema = z.object({
  party_type: z.enum(['customer', 'supplier']),
  party_id: z.string().uuid('Party reference is required'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  payment_method: z.enum(['cash', 'bank_transfer', 'upi', 'cheque']),
  reference_no: z.string().optional().default(''),
  allocations: z.array(paymentAllocationSchema).default([]),
  notes: z.string().optional().default('')
}).refine((data) => {
  // If customer payment has allocations, total allocated cannot exceed payment amount
  if (data.allocations.length > 0) {
    const totalAllocated = data.allocations.reduce((sum, a) => sum + a.amount_allocated, 0);
    return totalAllocated <= (data.amount + 0.01);
  }
  return true;
}, {
  message: 'Total allocated across invoices cannot exceed total payment amount',
  path: ['amount']
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// 7. PURCHASE & GOODS RECEIPT SCHEMA
export const purchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  product_sku: z.string(),
  product_name: z.string(),
  uom: z.string(),
  quantity_ordered: z.number().positive('Quantity must be greater than zero'),
  unit_cost: z.number().nonnegative('Unit cost cannot be negative'),
  tax_rate: z.number().default(0),
  hsn_code: z.string().optional()
});

export const purchaseSchema = z.object({
  supplier_id: z.string().uuid('Supplier selection is required'),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  items: z.array(purchaseItemSchema).min(1, 'Purchase must contain at least one item'),
  notes: z.string().optional().default('')
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
