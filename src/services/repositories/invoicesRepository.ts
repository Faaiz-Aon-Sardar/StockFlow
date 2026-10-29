/**
 * Invoices Repository
 * Manages GST Tax Invoices, immutable line snapshots, and derived balance integration.
 */

import { supabase } from '../supabase';
import { DbInvoice, InvoiceStatus, TaxBreakdown } from '../../types/database';
import { formatDatabaseError } from './common';

export async function getInvoices(businessId: string): Promise<DbInvoice[]> {
  try {
    // Query dynamic balance view joined with invoice items and customer
    const { data, error } = await supabase
      .from('v_invoice_balances')
      .select(`
        *,
        invoice:invoices(
          *,
          customer:parties(name, gstin, phone),
          items:invoice_items(*)
        )
      `)
      .eq('business_id', businessId)
      .order('issue_date', { ascending: false });

    if (error) {
      // Fallback to base table if view RLS query fails
      const { data: baseInvoices, error: baseError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:parties(name, gstin, phone),
          items:invoice_items(*)
        `)
        .eq('business_id', businessId)
        .order('issue_date', { ascending: false });

      if (baseError) throw formatDatabaseError(baseError);
      return (baseInvoices || []).map((inv) => ({
        ...inv,
        total_paid: 0,
        balance_due: inv.grand_total
      }));
    }

    return (data || []).map((row) => ({
      ...row.invoice,
      total_paid: Number(row.total_paid || 0),
      balance_due: Number(row.balance_due || 0),
      status: row.computed_status || row.status
    }));
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function createInvoice(
  businessId: string,
  params: {
    orderId?: string;
    customerId: string;
    billingAddress: string;
    shippingAddress: string;
    customerGstin?: string;
    issueDate: string;
    dueDate: string;
    paymentTerms: string;
    items: {
      productId: string;
      productSku: string;
      productName: string;
      description?: string;
      uom: any;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
      hsnCode?: string;
    }[];
    notes?: string;
  },
  userId: string
): Promise<DbInvoice> {
  try {
    // 1. Acquire concurrency-safe invoice serial number
    const { data: invoiceNumber, error: numError } = await supabase.rpc('get_next_document_number', {
      p_business_id: businessId,
      p_doc_type: 'invoice'
    });

    if (numError) throw formatDatabaseError(numError);

    // 2. Compute financial totals and tax breakdown
    let subtotal = 0;
    let discountTotal = 0;
    const rateMap = new Map<number, number>();

    const processedItems = params.items.map((it) => {
      const base = it.quantity * it.unitPrice;
      const discountAmount = Number(((base * it.discountPercent) / 100).toFixed(2));
      const taxable = base - discountAmount;
      const taxAmount = Number(((taxable * it.taxRate) / 100).toFixed(2));
      const lineTotal = Number((taxable + taxAmount).toFixed(2));

      subtotal += base;
      discountTotal += discountAmount;

      const prevTaxable = rateMap.get(it.taxRate) || 0;
      rateMap.set(it.taxRate, prevTaxable + taxable);

      return {
        product_id: it.productId,
        product_sku: it.productSku,
        product_name: it.productName,
        description: it.description || null,
        uom: it.uom,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        discount_percent: it.discountPercent,
        discount_amount: discountAmount,
        tax_rate: it.taxRate,
        tax_amount: taxAmount,
        line_total: lineTotal,
        hsn_code: it.hsnCode || null
      };
    });

    const taxBreakdown: TaxBreakdown[] = [];
    let taxTotal = 0;
    rateMap.forEach((taxableAmount, rate) => {
      const totalTax = Number(((taxableAmount * rate) / 100).toFixed(2));
      taxTotal += totalTax;
      const halfTax = Number((totalTax / 2).toFixed(2));
      taxBreakdown.push({
        rate,
        taxableAmount,
        cgst: halfTax,
        sgst: halfTax,
        igst: 0
      });
    });

    const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));

    // 3. Insert invoice header
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        business_id: businessId,
        invoice_number: invoiceNumber || `INV-${Date.now()}`,
        order_id: params.orderId || null,
        customer_id: params.customerId,
        billing_address: params.billingAddress,
        shipping_address: params.shippingAddress,
        customer_gstin: params.customerGstin || null,
        issue_date: params.issueDate,
        due_date: params.dueDate,
        subtotal,
        discount_total: discountTotal,
        tax_breakdown: taxBreakdown,
        tax_total: taxTotal,
        grand_total: grandTotal,
        status: 'issued', // Immediate issuance per wholesale flow
        payment_terms: params.paymentTerms,
        notes: params.notes,
        created_by: userId
      })
      .select()
      .single();

    if (invError) throw formatDatabaseError(invError);

    // 4. Insert immutable line snapshots
    const itemsToInsert = processedItems.map((item) => ({
      ...item,
      invoice_id: invoice.id
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) throw formatDatabaseError(itemsError);

    return {
      ...invoice,
      total_paid: 0,
      balance_due: grandTotal,
      items: processedItems as any
    };
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function cancelInvoice(
  businessId: string,
  invoiceId: string,
  reason: string
): Promise<DbInvoice> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw formatDatabaseError(error);
    return data;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}
