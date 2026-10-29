/**
 * Sales Orders Repository
 * Manages order agreements, line calculations, and stock reservation transitions.
 */

import { supabase } from '../supabase';
import { DbSalesOrder, OrderStatus } from '../../types/database';
import { salesOrderSchema, SalesOrderInput } from '../validation';
import { formatDatabaseError } from './common';

export async function getOrders(businessId: string): Promise<DbSalesOrder[]> {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:parties(*),
        items:sales_order_items(*)
      `)
      .eq('business_id', businessId)
      .order('order_date', { ascending: false });

    if (error) throw formatDatabaseError(error);
    return data || [];
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function createOrder(
  businessId: string,
  input: SalesOrderInput,
  userId: string
): Promise<DbSalesOrder> {
  const validated = salesOrderSchema.parse(input);

  try {
    // 1. Concurrency-safe sequence numbering from database function
    const { data: orderNumber, error: numError } = await supabase.rpc('get_next_document_number', {
      p_business_id: businessId,
      p_doc_type: 'order'
    });

    if (numError) throw formatDatabaseError(numError);

    // 2. Compute exact line item arithmetic
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const lineItemsData = validated.items.map((it) => {
      const base = it.quantity * it.unit_price;
      const discountAmount = Number(((base * it.discount_percent) / 100).toFixed(2));
      const taxable = base - discountAmount;
      const taxAmount = Number(((taxable * it.tax_rate) / 100).toFixed(2));
      const lineTotal = Number((taxable + taxAmount).toFixed(2));

      subtotal += base;
      discountTotal += discountAmount;
      taxTotal += taxAmount;

      return {
        product_id: it.product_id,
        product_sku: it.product_sku,
        product_name: it.product_name,
        uom: it.uom,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_percent: it.discount_percent,
        discount_amount: discountAmount,
        tax_rate: it.tax_rate,
        tax_amount: taxAmount,
        line_total: lineTotal,
        hsn_code: it.hsn_code || null
      };
    });

    const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));

    // 3. Insert sales order header
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert({
        business_id: businessId,
        order_number: orderNumber || `SO-${Date.now()}`,
        customer_id: validated.customer_id,
        order_date: validated.order_date,
        expected_delivery_date: validated.expected_delivery_date || null,
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        status: validated.status,
        payment_status: 'unpaid',
        notes: validated.notes,
        created_by: userId
      })
      .select()
      .single();

    if (orderError) throw formatDatabaseError(orderError);

    // 4. Insert order line items
    const itemsToInsert = lineItemsData.map((item) => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(itemsToInsert);

    if (itemsError) throw formatDatabaseError(itemsError);

    return { ...order, items: lineItemsData as any };
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function updateOrderStatus(
  businessId: string,
  orderId: string,
  status: OrderStatus
): Promise<DbSalesOrder> {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw formatDatabaseError(error);
    return data;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}
