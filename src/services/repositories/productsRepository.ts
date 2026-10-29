/**
 * Products Repository
 * Manages product catalog, pricing slabs, and physical inventory adjustments.
 */

import { supabase } from '../supabase';
import { DbProduct, DbStockMovement } from '../../types/database';
import { productSchema, ProductInput } from '../validation';
import { formatDatabaseError } from './common';

export async function getProducts(businessId: string): Promise<DbProduct[]> {
  try {
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (prodError) throw formatDatabaseError(prodError);

    // Compute live stock totals from stock_movements ledger
    const { data: movements, error: movError } = await supabase
      .from('stock_movements')
      .select('product_id, change_qty')
      .eq('business_id', businessId);

    if (movError) throw formatDatabaseError(movError);

    // Calculate sum of movements per product
    const stockMap = new Map<string, number>();
    movements?.forEach((m) => {
      const current = stockMap.get(m.product_id) || 0;
      stockMap.set(m.product_id, current + Number(m.change_qty));
    });

    return (products || []).map((p) => ({
      ...p,
      current_stock: stockMap.get(p.id) || 0,
      reserved_stock: 0 // Enhanced via active order reservations
    }));
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function createProduct(businessId: string, input: ProductInput): Promise<DbProduct> {
  // 1. Validate with Zod
  const validated = productSchema.parse(input);

  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id: businessId,
        sku: validated.sku,
        name: validated.name,
        category: validated.category,
        description: validated.description,
        uom: validated.uom,
        purchase_cost: validated.purchase_cost,
        default_selling_price: validated.default_selling_price,
        reorder_level: validated.reorder_level,
        hsn_code: validated.hsn_code || null,
        gst_rate: validated.gst_rate,
        wholesale_tiers: validated.wholesale_tiers,
        status: validated.status
      })
      .select()
      .single();

    if (error) throw formatDatabaseError(error);
    return { ...data, current_stock: 0, reserved_stock: 0 };
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function updateProduct(
  businessId: string,
  productId: string,
  input: Partial<ProductInput>
): Promise<DbProduct> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw formatDatabaseError(error);
    return data;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}

export async function recordStockAdjustment(
  businessId: string,
  productId: string,
  changeQty: number,
  previousStock: number,
  reason: string,
  userId: string
): Promise<DbStockMovement> {
  if (changeQty === 0) {
    throw new Error('Stock adjustment quantity cannot be zero.');
  }

  const newStock = previousStock + changeQty;
  if (newStock < 0) {
    throw new Error('Adjustment would result in negative inventory balance.');
  }

  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        business_id: businessId,
        product_id: productId,
        movement_type: 'adjustment',
        change_qty: changeQty,
        previous_stock: previousStock,
        new_stock: newStock,
        reason,
        performed_by: userId
      })
      .select()
      .single();

    if (error) throw formatDatabaseError(error);
    return data;
  } catch (err) {
    throw formatDatabaseError(err);
  }
}
