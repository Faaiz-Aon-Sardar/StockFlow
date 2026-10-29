/**
 * Payments Repository
 * Manages customer collection receipts, supplier disbursements, and multi-invoice allocations.
 */

import { supabase } from '../supabase';
import { DbPayment } from '../../types/database';
import { paymentSchema, PaymentInput } from '../validation';
import { formatDatabaseError } from './common';

export async function getPayments(businessId: string): Promise<DbPayment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        party:parties(name, phone, code),
        allocations:payment_allocations(
          *,
          invoice:invoices(invoice_number, grand_total)
        )
      `)
      .eq('business_id', businessId)
      .order('payment_date', { ascending: false });

    if (error) throw formatDatabaseError(error);
    return data || [];
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function recordPayment(
  businessId: string,
  input: PaymentInput,
  userId: string
): Promise<DbPayment> {
  const validated = paymentSchema.parse(input);

  try {
    // 1. Attempt atomic stored procedure execution
    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_payment_with_allocations', {
      p_business_id: businessId,
      p_party_type: validated.party_type,
      p_party_id: validated.party_id,
      p_amount: validated.amount,
      p_method: validated.payment_method,
      p_ref_no: validated.reference_no || null,
      p_allocations: validated.allocations || [],
      p_user_id: userId
    });

    if (!rpcError && rpcResult?.payment_id) {
      const { data: payment, error: fetchErr } = await supabase
        .from('payments')
        .select(`
          *,
          party:parties(name),
          allocations:payment_allocations(*)
        `)
        .eq('id', rpcResult.payment_id)
        .single();

      if (!fetchErr && payment) return payment;
    }

    if (rpcError && rpcError.code !== '42883') {
      throw formatDatabaseError(rpcError);
    }

    // Fallback: Direct sequence if RPC not yet deployed
    const { data: paymentNumber, error: numError } = await supabase.rpc('get_next_document_number', {
      p_business_id: businessId,
      p_doc_type: 'payment'
    });

    if (numError) throw formatDatabaseError(numError);

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        business_id: businessId,
        payment_number: paymentNumber || `RCP-${Date.now()}`,
        payment_date: validated.payment_date,
        party_type: validated.party_type,
        party_id: validated.party_id,
        amount: validated.amount,
        payment_method: validated.payment_method,
        reference_no: validated.reference_no || null,
        notes: validated.notes,
        created_by: userId
      })
      .select()
      .single();

    if (payError) throw formatDatabaseError(payError);

    if (validated.allocations && validated.allocations.length > 0) {
      const allocationsToInsert = validated.allocations.map((alloc) => ({
        business_id: businessId,
        payment_id: payment.id,
        invoice_id: alloc.invoice_id,
        amount_allocated: alloc.amount_allocated
      }));

      const { error: allocError } = await supabase
        .from('payment_allocations')
        .insert(allocationsToInsert);

      if (allocError) throw formatDatabaseError(allocError);
    }

    return payment;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}
