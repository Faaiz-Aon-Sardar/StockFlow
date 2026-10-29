/**
 * Dispatches Repository
 * Manages physical fulfillment, transport carrier assignments, and inventory deductions.
 */

import { supabase } from '../supabase';
import { DbDispatch, DispatchStatus } from '../../types/database';
import { dispatchSchema, DispatchInput } from '../validation';
import { formatDatabaseError } from './common';

export async function getDispatches(businessId: string): Promise<DbDispatch[]> {
  try {
    const { data, error } = await supabase
      .from('dispatches')
      .select(`
        *,
        order:sales_orders(order_number, total_qty:grand_total),
        customer:parties(name, phone),
        items:dispatch_items(
          *,
          product:products(name, sku, uom)
        )
      `)
      .eq('business_id', businessId)
      .order('dispatch_date', { ascending: false });

    if (error) throw formatDatabaseError(error);
    return data || [];
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function recordDispatch(
  businessId: string,
  input: DispatchInput,
  userId: string
): Promise<DbDispatch> {
  const validated = dispatchSchema.parse(input);

  try {
    // 1. Attempt atomic stored procedure execution
    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_dispatch', {
      p_business_id: businessId,
      p_order_id: validated.order_id,
      p_carrier_name: validated.carrier_name,
      p_vehicle_no: validated.vehicle_or_tracking_no,
      p_items: validated.items,
      p_user_id: userId
    });

    if (!rpcError && rpcResult?.dispatch_id) {
      // Fetch full dispatch record
      const { data: dispatch, error: fetchErr } = await supabase
        .from('dispatches')
        .select(`
          *,
          order:sales_orders(order_number),
          customer:parties(name),
          items:dispatch_items(*)
        `)
        .eq('id', rpcResult.dispatch_id)
        .single();

      if (!fetchErr && dispatch) return dispatch;
    }

    // Fallback: If RPC not deployed, execute verified client-side sequence
    if (rpcError && rpcError.code !== '42883') { // 42883 is undefined function
      throw formatDatabaseError(rpcError);
    }

    const { data: order, error: orderErr } = await supabase
      .from('sales_orders')
      .select('id, order_number, customer_id, shipping_address:notes')
      .eq('id', validated.order_id)
      .eq('business_id', businessId)
      .single();

    if (orderErr || !order) throw new Error('Sales order not found for this business.');

    const { data: dispatchNumber, error: numError } = await supabase.rpc('get_next_document_number', {
      p_business_id: businessId,
      p_doc_type: 'dispatch'
    });

    if (numError) throw formatDatabaseError(numError);

    const { data: dispatch, error: dispError } = await supabase
      .from('dispatches')
      .insert({
        business_id: businessId,
        dispatch_number: dispatchNumber || `DSP-${Date.now()}`,
        order_id: validated.order_id,
        customer_id: order.customer_id,
        dispatch_date: new Date().toISOString().split('T')[0],
        carrier_name: validated.carrier_name,
        vehicle_or_tracking_no: validated.vehicle_or_tracking_no,
        shipping_address: validated.shipping_address || 'As per order',
        status: 'in_transit',
        notes: validated.notes,
        dispatched_by: userId
      })
      .select()
      .single();

    if (dispError) throw formatDatabaseError(dispError);

    const dispatchItemsToInsert = validated.items.map((it) => ({
      dispatch_id: dispatch.id,
      product_id: it.product_id,
      quantity_dispatched: it.quantity_dispatched
    }));

    const { error: itemsError } = await supabase
      .from('dispatch_items')
      .insert(dispatchItemsToInsert);

    if (itemsError) throw formatDatabaseError(itemsError);

    for (const it of validated.items) {
      const { data: movs } = await supabase
        .from('stock_movements')
        .select('change_qty')
        .eq('business_id', businessId)
        .eq('product_id', it.product_id);

      const currentStock = (movs || []).reduce((sum, m) => sum + Number(m.change_qty), 0);
      const newStock = Math.max(0, currentStock - it.quantity_dispatched);

      await supabase.from('stock_movements').insert({
        business_id: businessId,
        product_id: it.product_id,
        movement_type: 'dispatch',
        change_qty: -it.quantity_dispatched,
        previous_stock: currentStock,
        new_stock: newStock,
        reason: `Dispatched against order ${order.order_number}`,
        reference_id: dispatch.dispatch_number,
        reference_type: 'dispatch',
        reference_uuid: dispatch.id,
        performed_by: userId
      });
    }

    await supabase
      .from('sales_orders')
      .update({ status: 'dispatched', updated_at: new Date().toISOString() })
      .eq('id', validated.order_id);

    return dispatch;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function updateDispatchStatus(
  businessId: string,
  dispatchId: string,
  status: DispatchStatus
): Promise<DbDispatch> {
  try {
    const { data, error } = await supabase
      .from('dispatches')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', dispatchId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw formatDatabaseError(error);
    return data;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}
