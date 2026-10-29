/**
 * Purchases Repository
 * Manages supplier purchase orders, goods receipt (GRN), and inventory additions.
 */

import { supabase } from '../supabase';
import { DbPurchase } from '../../types/database';
import { purchaseSchema, PurchaseInput } from '../validation';
import { formatDatabaseError } from './common';

export async function getPurchases(businessId: string): Promise<DbPurchase[]> {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        supplier:parties(name, phone, code),
        items:purchase_items(*)
      `)
      .eq('business_id', businessId)
      .order('order_date', { ascending: false });

    if (error) throw formatDatabaseError(error);
    return data || [];
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function createPurchase(
  businessId: string,
  input: PurchaseInput,
  userId: string
): Promise<DbPurchase> {
  const validated = purchaseSchema.parse(input);

  try {
    // 1. Acquire sequence number
    const { data: purchaseRef, error: numError } = await supabase.rpc('get_next_document_number', {
      p_business_id: businessId,
      p_doc_type: 'purchase'
    });

    if (numError) throw formatDatabaseError(numError);

    // 2. Compute item totals
    let subtotal = 0;
    let taxTotal = 0;

    const lineItemsData = validated.items.map((it) => {
      const base = it.quantity_ordered * it.unit_cost;
      const taxAmount = Number(((base * it.tax_rate) / 100).toFixed(2));
      const lineTotal = Number((base + taxAmount).toFixed(2));

      subtotal += base;
      taxTotal += taxAmount;

      return {
        product_id: it.product_id,
        product_sku: it.product_sku,
        product_name: it.product_name,
        uom: it.uom,
        quantity_ordered: it.quantity_ordered,
        quantity_received: 0,
        unit_cost: it.unit_cost,
        tax_rate: it.tax_rate,
        tax_amount: taxAmount,
        line_total: lineTotal,
        hsn_code: it.hsn_code || null
      };
    });

    const grandTotal = Number((subtotal + taxTotal).toFixed(2));

    // 3. Insert purchase order header
    const { data: purchase, error: poError } = await supabase
      .from('purchases')
      .insert({
        business_id: businessId,
        purchase_ref: purchaseRef || `PO-${Date.now()}`,
        supplier_id: validated.supplier_id,
        order_date: validated.order_date,
        expected_date: validated.expected_date || null,
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        status: 'ordered',
        payment_status: 'unpaid',
        notes: validated.notes,
        created_by: userId
      })
      .select()
      .single();

    if (poError) throw formatDatabaseError(poError);

    // 4. Insert purchase line items
    const itemsToInsert = lineItemsData.map((item) => ({
      ...item,
      purchase_id: purchase.id
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(itemsToInsert);

    if (itemsError) throw formatDatabaseError(itemsError);

    return { ...purchase, items: lineItemsData as any };
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function receiveGoods(
  businessId: string,
  purchaseId: string,
  receivedItems: { product_id: string; quantity_received: number }[],
  userId: string
): Promise<void> {
  try {
    // Call atomic stored procedure
    const { error } = await supabase.rpc('process_goods_receipt', {
      p_business_id: businessId,
      p_purchase_id: purchaseId,
      p_receipt_items: receivedItems,
      p_user_id: userId
    });

    if (error) throw formatDatabaseError(error);
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function recordSupplierReturn(
  businessId: string,
  purchaseId: string,
  returnedItems: { product_id: string; quantity: number }[],
  reason: string,
  userId: string
): Promise<void> {
  try {
    for (const ri of returnedItems) {
      if (ri.quantity <= 0) continue;

      // Get current balance
      const { data: movs } = await supabase
        .from('stock_movements')
        .select('change_qty')
        .eq('business_id', businessId)
        .eq('product_id', ri.product_id);

      const currentStock = (movs || []).reduce((sum, m) => sum + Number(m.change_qty), 0);
      const newStock = Math.max(0, currentStock - ri.quantity);

      await supabase.from('stock_movements').insert({
        business_id: businessId,
        product_id: ri.product_id,
        movement_type: 'return',
        change_qty: -ri.quantity,
        previous_stock: currentStock,
        new_stock: newStock,
        reason: `Return to Vendor: ${reason}`,
        reference_type: 'vendor_return',
        reference_uuid: purchaseId,
        performed_by: userId
      });
    }
  } catch (err) {
    throw formatDatabaseError(err);
  }
}
