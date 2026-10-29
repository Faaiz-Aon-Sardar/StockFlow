/**
 * Parties Repository
 * Manages commercial partners: Kirana customers, retail stores, wholesale suppliers, and depots.
 */

import { supabase } from '../supabase';
import { DbParty, PartyType } from '../../types/database';
import { partySchema, PartyInput } from '../validation';
import { formatDatabaseError } from './common';

export async function getParties(businessId: string, type?: PartyType): Promise<DbParty[]> {
  try {
    let query = supabase
      .from('v_party_balances')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (type && type !== 'both') {
      // Return both dedicated type and dual-role ('both') parties
      query = query.in('party_type', [type, 'both']);
    }

    const { data, error } = await query;
    if (error) {
      // Fallback query to base table if view is not accessible
      const { data: baseData, error: baseError } = await supabase
        .from('parties')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (baseError) throw formatDatabaseError(baseError);
      return (baseData || []).map((p) => ({ ...p, current_outstanding: p.opening_balance }));
    }

    return (data || []).map((p) => ({
      ...p,
      current_outstanding: Number(p.current_outstanding || 0)
    }));
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function createParty(businessId: string, input: PartyInput): Promise<DbParty> {
  // 1. Zod runtime validation
  const validated = partySchema.parse(input);

  try {
    const { data, error } = await supabase
      .from('parties')
      .insert({
        business_id: businessId,
        code: validated.code,
        name: validated.name,
        party_type: validated.party_type,
        contact_person: validated.contact_person,
        phone: validated.phone,
        email: validated.email || null,
        billing_address: validated.billing_address,
        shipping_address: validated.shipping_address,
        gstin: validated.gstin || null,
        pan_number: validated.pan_number || null,
        payment_terms: validated.payment_terms,
        credit_limit: validated.credit_limit,
        opening_balance: validated.opening_balance,
        notes: validated.notes,
        status: validated.status
      })
      .select()
      .single();

    if (error) throw formatDatabaseError(error);
    return { ...data, current_outstanding: data.opening_balance };
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function updateParty(
  businessId: string,
  partyId: string,
  input: Partial<PartyInput>
): Promise<DbParty> {
  try {
    const { data, error } = await supabase
      .from('parties')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', partyId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw formatDatabaseError(error);
    return data;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function togglePartyStatus(
  businessId: string,
  partyId: string,
  currentStatus: 'active' | 'archived'
): Promise<DbParty> {
  const nextStatus = currentStatus === 'active' ? 'archived' : 'active';
  return updateParty(businessId, partyId, { status: nextStatus });
}
