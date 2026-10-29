/**
 * Reports Repository
 * Provides inventory audit movements, customer receivables aging, and financial analytics.
 */

import { supabase } from '../supabase';
import { DbStockMovement } from '../../types/database';
import { formatDatabaseError } from './common';

export async function getStockMovements(businessId: string): Promise<DbStockMovement[]> {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(name, sku, uom)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw formatDatabaseError(error);
    return data || [];
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function getReceivablesAging(businessId: string) {
  try {
    const { data: invoices, error } = await supabase
      .from('v_invoice_balances')
      .select(`
        *,
        invoice:invoices(customer:parties(name, phone, code))
      `)
      .eq('business_id', businessId)
      .gt('balance_due', 0.01)
      .neq('status', 'cancelled');

    if (error) throw formatDatabaseError(error);

    const now = new Date();
    const buckets = {
      current: 0,   // 0-15 days
      aging16_30: 0,// 16-30 days
      aging31_60: 0,// 31-60 days
      over60: 0     // > 60 days
    };

    (invoices || []).forEach((inv) => {
      const due = new Date(inv.due_date);
      const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 3600 * 24));
      const bal = Number(inv.balance_due || 0);

      if (diffDays <= 0) buckets.current += bal;
      else if (diffDays <= 15) buckets.current += bal;
      else if (diffDays <= 30) buckets.aging16_30 += bal;
      else if (diffDays <= 60) buckets.aging31_60 += bal;
      else buckets.over60 += bal;
    });

    return buckets;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}
