/**
 * StockFlow Unified Data API
 * 
 * Rules:
 * 1. If Supabase is configured, all operations target Supabase PostgreSQL with strict RLS.
 * 2. Never silently fall back to mock data upon a database error.
 * 3. Mock data is accessible only when Supabase is explicitly unconfigured AND dev mock mode is enabled.
 */

import { isSupabaseConfigured } from './supabase';
import * as productsRepo from './repositories/productsRepository';
import * as partiesRepo from './repositories/partiesRepository';
import * as ordersRepo from './repositories/ordersRepository';
import * as dispatchesRepo from './repositories/dispatchesRepository';
import * as invoicesRepo from './repositories/invoicesRepository';
import * as paymentsRepo from './repositories/paymentsRepository';
import * as purchasesRepo from './repositories/purchasesRepository';
import * as reportsRepo from './repositories/reportsRepository';
import { storage } from './storage';
import { DbProduct, DbParty, DbSalesOrder, DbDispatch, DbInvoice, DbPayment, DbPurchase, DbStockMovement } from '../types/database';
import { ProductInput, PartyInput, SalesOrderInput, DispatchInput, PaymentInput, PurchaseInput } from './validation';

const DEV_MOCK_ENABLED = import.meta.env.VITE_ENABLE_DEV_MOCK_DATA === 'true';

export const isUsingMockData = !isSupabaseConfigured() && DEV_MOCK_ENABLED;

export const api = {
  isConfigured: isSupabaseConfigured(),
  isMock: isUsingMockData,

  // --- PRODUCTS ---
  async getProducts(businessId: string): Promise<DbProduct[]> {
    if (isUsingMockData) {
      const mock = storage.getProducts();
      return mock.map((p) => ({
        id: p.id,
        business_id: businessId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: p.description,
        uom: p.uom,
        purchase_cost: p.purchaseCost,
        default_selling_price: p.defaultSellingPrice,
        reorder_level: p.reorderLevel,
        hsn_code: p.hsnCode,
        gst_rate: p.gstRate,
        wholesale_tiers: p.wholesaleTiers,
        status: p.status,
        current_stock: p.currentStock,
        reserved_stock: p.reservedStock,
        created_at: p.createdAt,
        updated_at: p.updatedAt
      }));
    }
    return productsRepo.getProducts(businessId);
  },

  async createProduct(businessId: string, input: ProductInput): Promise<DbProduct> {
    if (isUsingMockData) {
      const created = storage.saveProduct({
        sku: input.sku,
        name: input.name,
        category: input.category,
        description: input.description,
        uom: input.uom,
        purchaseCost: input.purchase_cost,
        defaultSellingPrice: input.default_selling_price,
        reorderLevel: input.reorder_level,
        hsnCode: input.hsn_code || '',
        gstRate: input.gst_rate,
        wholesaleTiers: (input.wholesale_tiers || []).map((t) => ({ minQty: t.minQty!, unitPrice: t.unitPrice! })),
        currentStock: 0,
        reservedStock: 0,
        status: input.status
      });
      return {
        id: created.id,
        business_id: businessId,
        sku: input.sku,
        name: input.name,
        category: input.category,
        description: input.description,
        uom: input.uom as any,
        purchase_cost: input.purchase_cost,
        default_selling_price: input.default_selling_price,
        reorder_level: input.reorder_level,
        hsn_code: input.hsn_code,
        gst_rate: input.gst_rate,
        wholesale_tiers: (input.wholesale_tiers || []) as any,
        status: input.status || 'active',
        current_stock: 0,
        reserved_stock: 0,
        created_at: created.createdAt,
        updated_at: created.updatedAt
      };
    }
    return productsRepo.createProduct(businessId, input);
  },

  async updateProduct(businessId: string, id: string, input: Partial<ProductInput>): Promise<DbProduct> {
    if (isUsingMockData) {
      const updated = storage.saveProduct({
        id,
        sku: input.sku,
        name: input.name,
        category: input.category,
        purchaseCost: input.purchase_cost,
        defaultSellingPrice: input.default_selling_price
      });
      return {
        id: updated.id,
        business_id: businessId,
        sku: updated.sku,
        name: updated.name,
        category: updated.category,
        description: updated.description,
        uom: updated.uom,
        purchase_cost: updated.purchaseCost,
        default_selling_price: updated.defaultSellingPrice,
        reorder_level: updated.reorderLevel,
        hsn_code: updated.hsnCode,
        gst_rate: updated.gstRate,
        wholesale_tiers: updated.wholesaleTiers,
        status: updated.status,
        current_stock: updated.currentStock,
        reserved_stock: updated.reservedStock,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt
      };
    }
    return productsRepo.updateProduct(businessId, id, input);
  },

  async adjustStock(businessId: string, productId: string, changeQty: number, previousStock: number, reason: string, userId: string) {
    if (isUsingMockData) {
      storage.adjustStock(productId, changeQty, reason, 'Local Dev User');
      return;
    }
    return productsRepo.recordStockAdjustment(businessId, productId, changeQty, previousStock, reason, userId);
  },

  // --- PARTIES (CUSTOMERS / SUPPLIERS) ---
  async getParties(businessId: string, type?: 'customer' | 'supplier' | 'both'): Promise<DbParty[]> {
    if (isUsingMockData) {
      const customers = (type === 'supplier') ? [] : storage.getCustomers().map((c) => ({
        id: c.id,
        business_id: businessId,
        code: c.code,
        name: c.name,
        party_type: 'customer' as const,
        contact_person: c.contactPerson,
        phone: c.phone,
        email: c.email,
        billing_address: c.billingAddress,
        shipping_address: c.shippingAddress,
        gstin: c.gstin,
        payment_terms: c.paymentTerms,
        credit_limit: c.creditLimit,
        opening_balance: c.openingBalance,
        current_outstanding: c.currentOutstanding,
        status: c.status,
        notes: c.notes,
        created_at: c.createdAt,
        updated_at: c.createdAt
      }));

      const suppliers = (type === 'customer') ? [] : storage.getSuppliers().map((s) => ({
        id: s.id,
        business_id: businessId,
        code: s.code,
        name: s.name,
        party_type: 'supplier' as const,
        contact_person: s.contactPerson,
        phone: s.phone,
        email: s.email,
        billing_address: s.address,
        shipping_address: s.address,
        gstin: s.gstin,
        payment_terms: s.paymentTerms,
        credit_limit: 0,
        opening_balance: s.openingBalance,
        current_outstanding: s.currentOutstanding,
        status: s.status,
        notes: s.notes,
        created_at: s.createdAt,
        updated_at: s.createdAt
      }));

      return [...customers, ...suppliers];
    }
    return partiesRepo.getParties(businessId, type);
  },

  async createParty(businessId: string, input: PartyInput): Promise<DbParty> {
    if (isUsingMockData) {
      if (input.party_type === 'customer') {
        const c = storage.saveCustomer({
          code: input.code,
          name: input.name,
          contactPerson: input.contact_person,
          phone: input.phone,
          email: input.email,
          billingAddress: input.billing_address,
          shippingAddress: input.shipping_address,
          gstin: input.gstin,
          paymentTerms: input.payment_terms as any,
          creditLimit: input.credit_limit,
          openingBalance: input.opening_balance,
          notes: input.notes
        });
        return {
          id: c.id,
          business_id: businessId,
          code: input.code,
          name: input.name,
          party_type: 'customer',
          contact_person: input.contact_person,
          phone: input.phone,
          email: input.email,
          billing_address: input.billing_address,
          shipping_address: input.shipping_address,
          gstin: input.gstin,
          payment_terms: input.payment_terms as any,
          credit_limit: input.credit_limit || 0,
          opening_balance: input.opening_balance || 0,
          notes: input.notes,
          status: input.status || 'active',
          current_outstanding: c.currentOutstanding,
          created_at: c.createdAt,
          updated_at: c.createdAt
        };
      } else {
        const s = storage.saveSupplier({
          code: input.code,
          name: input.name,
          contactPerson: input.contact_person,
          phone: input.phone,
          email: input.email,
          address: input.billing_address || '',
          gstin: input.gstin,
          paymentTerms: input.payment_terms as any,
          openingBalance: input.opening_balance,
          notes: input.notes
        });
        return {
          id: s.id,
          business_id: businessId,
          code: input.code,
          name: input.name,
          party_type: 'supplier',
          contact_person: input.contact_person,
          phone: input.phone,
          email: input.email,
          billing_address: input.billing_address,
          shipping_address: input.shipping_address,
          gstin: input.gstin,
          payment_terms: input.payment_terms as any,
          credit_limit: input.credit_limit || 0,
          opening_balance: input.opening_balance || 0,
          notes: input.notes,
          status: input.status || 'active',
          current_outstanding: s.currentOutstanding,
          created_at: s.createdAt,
          updated_at: s.createdAt
        };
      }
    }
    return partiesRepo.createParty(businessId, input);
  },

  async updateParty(businessId: string, id: string, input: Partial<PartyInput>): Promise<DbParty> {
    if (isUsingMockData) {
      return this.getParties(businessId).then(list => list.find(p => p.id === id)!);
    }
    return partiesRepo.updateParty(businessId, id, input);
  },

  async togglePartyStatus(businessId: string, id: string, currentStatus: 'active' | 'archived') {
    if (isUsingMockData) {
      storage.toggleCustomerStatus(id);
      return;
    }
    return partiesRepo.togglePartyStatus(businessId, id, currentStatus);
  },

  // --- SALES ORDERS ---
  async getOrders(businessId: string): Promise<DbSalesOrder[]> {
    if (isUsingMockData) {
      const mock = storage.getOrders();
      return mock.map((o) => ({
        id: o.id,
        business_id: businessId,
        order_number: o.orderNumber,
        customer_id: o.customerId,
        order_date: o.orderDate,
        expected_delivery_date: o.expectedDeliveryDate,
        subtotal: o.subtotal,
        discount_total: o.discountTotal,
        tax_total: o.taxTotal,
        grand_total: o.grandTotal,
        status: o.status,
        payment_status: o.paymentStatus,
        notes: o.notes,
        created_at: o.createdAt,
        updated_at: o.createdAt,
        customer: { name: o.customerName, phone: o.customerPhone || '' } as any,
        items: o.items.map((it) => ({
          id: it.productId,
          order_id: o.id,
          product_id: it.productId,
          product_sku: it.sku,
          product_name: it.name,
          uom: it.uom,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          discount_percent: it.discountPercent,
          discount_amount: it.discountAmount,
          tax_rate: it.taxRate,
          tax_amount: it.taxAmount,
          line_total: it.lineTotal,
          created_at: o.createdAt
        }))
      }));
    }
    return ordersRepo.getOrders(businessId);
  },

  async createOrder(businessId: string, input: SalesOrderInput, userId: string): Promise<DbSalesOrder> {
    if (isUsingMockData) {
      const saved = storage.saveOrder({
        customerId: input.customer_id,
        orderDate: input.order_date,
        expectedDeliveryDate: input.expected_delivery_date,
        status: input.status,
        notes: input.notes,
        items: input.items.map((it) => ({
          productId: it.product_id,
          sku: it.product_sku,
          name: it.product_name,
          uom: it.uom as any,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          discountPercent: it.discount_percent,
          discountAmount: Number(((it.quantity * it.unit_price * it.discount_percent) / 100).toFixed(2)),
          taxRate: it.tax_rate,
          taxAmount: 0,
          lineTotal: it.quantity * it.unit_price,
          hsnCode: it.hsn_code || ''
        }))
      });
      return {
        id: saved.id,
        business_id: businessId,
        order_number: saved.orderNumber,
        customer_id: saved.customerId,
        order_date: saved.orderDate,
        subtotal: saved.subtotal,
        discount_total: saved.discountTotal,
        tax_total: saved.taxTotal,
        grand_total: saved.grandTotal,
        status: saved.status,
        payment_status: saved.paymentStatus,
        created_at: saved.createdAt,
        updated_at: saved.createdAt
      };
    }
    return ordersRepo.createOrder(businessId, input, userId);
  },

  async updateOrderStatus(businessId: string, orderId: string, status: any) {
    if (isUsingMockData) {
      const orders = storage.getOrders();
      const o = orders.find(ord => ord.id === orderId);
      if (o) {
        o.status = status;
        storage.saveOrder(o);
      }
      return;
    }
    return ordersRepo.updateOrderStatus(businessId, orderId, status);
  },

  // --- DISPATCHES ---
  async getDispatches(businessId: string): Promise<DbDispatch[]> {
    if (isUsingMockData) {
      const mock = storage.getDispatches();
      return mock.map((d) => ({
        id: d.id,
        business_id: businessId,
        dispatch_number: d.dispatchNumber,
        order_id: d.orderId,
        customer_id: d.customerId,
        dispatch_date: d.dispatchDate,
        carrier_name: d.carrierName,
        vehicle_or_tracking_no: d.vehicleOrTrackingNo,
        shipping_address: d.shippingAddress,
        status: d.status,
        notes: d.notes,
        created_at: d.createdAt,
        updated_at: d.createdAt,
        customer: { name: d.customerName } as any,
        order: { order_number: d.orderNumber } as any,
        items: d.items.map((it) => ({
          id: it.productId,
          dispatch_id: d.id,
          product_id: it.productId,
          quantity_dispatched: it.quantityDispatched,
          created_at: d.createdAt,
          product: { name: it.name, sku: it.sku, uom: it.uom } as any
        }))
      }));
    }
    return dispatchesRepo.getDispatches(businessId);
  },

  async recordDispatch(businessId: string, input: DispatchInput, userId: string): Promise<DbDispatch> {
    if (isUsingMockData) {
      const d = storage.recordDispatch({
        orderId: input.order_id,
        carrierName: input.carrier_name,
        vehicleOrTrackingNo: input.vehicle_or_tracking_no,
        notes: input.notes,
        operator: 'Dev Operator',
        itemsToDispatch: input.items.map((i) => ({ productId: i.product_id, quantity: i.quantity_dispatched }))
      });
      return {
        id: d.id,
        business_id: businessId,
        dispatch_number: d.dispatchNumber,
        order_id: d.orderId,
        customer_id: d.customerId,
        dispatch_date: d.dispatchDate,
        carrier_name: d.carrierName,
        vehicle_or_tracking_no: d.vehicleOrTrackingNo,
        shipping_address: d.shippingAddress,
        status: d.status,
        notes: d.notes,
        created_at: d.createdAt,
        updated_at: d.createdAt
      };
    }
    return dispatchesRepo.recordDispatch(businessId, input, userId);
  },

  // --- INVOICES ---
  async getInvoices(businessId: string): Promise<DbInvoice[]> {
    if (isUsingMockData) {
      const mock = storage.getInvoices();
      return mock.map((i) => ({
        id: i.id,
        business_id: businessId,
        invoice_number: i.invoiceNumber,
        order_id: i.orderId,
        customer_id: i.customerId,
        billing_address: i.billingAddress,
        shipping_address: i.shippingAddress,
        customer_gstin: i.customerGstin,
        issue_date: i.issueDate,
        due_date: i.dueDate,
        subtotal: i.subtotal,
        discount_total: i.discountTotal,
        tax_breakdown: i.taxBreakdown,
        tax_total: i.taxTotal,
        grand_total: i.grandTotal,
        status: i.status,
        payment_terms: i.paymentTerms,
        notes: i.notes,
        created_at: i.createdAt,
        updated_at: i.createdAt,
        total_paid: i.amountPaid,
        balance_due: i.balanceDue,
        customer: { name: i.customerName, gstin: i.customerGstin, phone: '' } as any,
        items: i.items.map((it) => ({
          id: it.productId,
          invoice_id: i.id,
          product_id: it.productId,
          product_sku: it.sku,
          product_name: it.name,
          uom: it.uom,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          discount_percent: it.discountPercent,
          discount_amount: it.discountAmount,
          tax_rate: it.taxRate,
          tax_amount: it.taxAmount,
          line_total: it.lineTotal,
          hsn_code: it.hsnCode,
          created_at: i.createdAt
        }))
      }));
    }
    return invoicesRepo.getInvoices(businessId);
  },

  async createInvoice(businessId: string, params: any, userId: string): Promise<DbInvoice> {
    if (isUsingMockData) {
      const inv = storage.saveInvoice({
        orderId: params.orderId,
        customerId: params.customerId,
        billingAddress: params.billingAddress,
        shippingAddress: params.shippingAddress,
        customerGstin: params.customerGstin,
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        paymentTerms: params.paymentTerms,
        notes: params.notes,
        status: 'issued',
        items: params.items.map((it: any) => ({
          productId: it.productId,
          sku: it.productSku,
          name: it.productName,
          uom: it.uom,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent,
          discountAmount: Number(((it.quantity * it.unitPrice * it.discountPercent) / 100).toFixed(2)),
          taxRate: it.taxRate,
          taxAmount: 0,
          lineTotal: it.quantity * it.unitPrice,
          hsnCode: it.hsnCode
        }))
      });
      return {
        ...params,
        id: inv.id,
        business_id: businessId,
        invoice_number: inv.invoiceNumber,
        grand_total: inv.grandTotal,
        status: 'issued',
        total_paid: 0,
        balance_due: inv.grandTotal,
        created_at: inv.createdAt,
        updated_at: inv.createdAt
      };
    }
    return invoicesRepo.createInvoice(businessId, params, userId);
  },

  async cancelInvoice(businessId: string, invoiceId: string, reason: string) {
    if (isUsingMockData) {
      const inv = storage.getInvoices().find(i => i.id === invoiceId);
      if (inv) {
        inv.status = 'cancelled';
        storage.saveInvoice(inv);
      }
      return;
    }
    return invoicesRepo.cancelInvoice(businessId, invoiceId, reason);
  },

  // --- PAYMENTS ---
  async getPayments(businessId: string): Promise<DbPayment[]> {
    if (isUsingMockData) {
      const mock = storage.getPayments();
      return mock.map((p) => ({
        id: p.id,
        business_id: businessId,
        payment_number: p.paymentNumber,
        payment_date: p.date,
        party_type: p.partyType,
        party_id: p.partyId,
        amount: p.amount,
        payment_method: p.method,
        reference_no: p.referenceNo,
        notes: p.notes,
        created_at: p.createdAt,
        party: { name: p.partyName } as any,
        allocations: p.allocations.map((a) => ({
          id: a.invoiceId,
          business_id: businessId,
          payment_id: p.id,
          invoice_id: a.invoiceId,
          amount_allocated: a.amountAllocated,
          created_at: p.createdAt,
          invoice: { invoice_number: a.invoiceNumber } as any
        }))
      }));
    }
    return paymentsRepo.getPayments(businessId);
  },

  async recordPayment(businessId: string, input: PaymentInput, userId: string): Promise<DbPayment> {
    if (isUsingMockData) {
      const pay = storage.recordPayment({
        date: input.payment_date,
        partyType: input.party_type,
        partyId: input.party_id,
        partyName: 'Customer / Supplier',
        amount: input.amount,
        method: input.payment_method,
        referenceNo: input.reference_no,
        notes: input.notes,
        allocations: input.allocations.map((a) => ({
          invoiceId: a.invoice_id,
          invoiceNumber: 'INV-ALLOC',
          amountAllocated: a.amount_allocated
        }))
      });
      return {
        id: pay.id,
        business_id: businessId,
        payment_number: pay.paymentNumber,
        payment_date: pay.date,
        party_type: pay.partyType,
        party_id: pay.partyId,
        amount: pay.amount,
        payment_method: pay.method,
        reference_no: pay.referenceNo,
        notes: pay.notes,
        created_at: pay.createdAt
      };
    }
    return paymentsRepo.recordPayment(businessId, input, userId);
  },

  // --- PURCHASES ---
  async getPurchases(businessId: string): Promise<DbPurchase[]> {
    if (isUsingMockData) {
      const mock = storage.getPurchases();
      return mock.map((po) => ({
        id: po.id,
        business_id: businessId,
        purchase_ref: po.purchaseRef,
        supplier_id: po.supplierId,
        order_date: po.orderDate,
        expected_date: po.expectedDate,
        received_date: po.receivedDate,
        subtotal: po.subtotal,
        tax_total: po.taxTotal,
        grand_total: po.grandTotal,
        status: po.status,
        payment_status: po.paymentStatus,
        notes: po.notes,
        created_at: po.createdAt,
        updated_at: po.createdAt,
        supplier: { name: po.supplierName } as any,
        items: po.items.map((it) => ({
          id: it.productId,
          purchase_id: po.id,
          product_id: it.productId,
          product_sku: it.sku,
          product_name: it.name,
          uom: it.uom,
          quantity_ordered: it.quantityOrdered,
          quantity_received: it.quantityReceived,
          unit_cost: it.unitCost,
          tax_rate: it.taxRate,
          tax_amount: it.taxAmount,
          line_total: it.lineTotal,
          hsn_code: it.hsnCode,
          created_at: po.createdAt
        }))
      }));
    }
    return purchasesRepo.getPurchases(businessId);
  },

  async createPurchase(businessId: string, input: PurchaseInput, userId: string): Promise<DbPurchase> {
    if (isUsingMockData) {
      const po = storage.savePurchaseOrder({
        supplierId: input.supplier_id,
        orderDate: input.order_date,
        expectedDate: input.expected_date,
        notes: input.notes,
        items: input.items.map((it) => ({
          productId: it.product_id,
          sku: it.product_sku,
          name: it.product_name,
          uom: it.uom as any,
          quantityOrdered: it.quantity_ordered,
          quantityReceived: 0,
          unitCost: it.unit_cost,
          taxRate: it.tax_rate,
          taxAmount: 0,
          lineTotal: it.quantity_ordered * it.unit_cost,
          hsnCode: it.hsn_code || ''
        }))
      });
      return {
        id: po.id,
        business_id: businessId,
        purchase_ref: po.purchaseRef,
        supplier_id: po.supplierId,
        order_date: po.orderDate,
        subtotal: po.subtotal,
        tax_total: po.taxTotal,
        grand_total: po.grandTotal,
        status: po.status,
        payment_status: po.paymentStatus,
        created_at: po.createdAt,
        updated_at: po.createdAt
      };
    }
    return purchasesRepo.createPurchase(businessId, input, userId);
  },

  async receiveGoods(businessId: string, purchaseId: string, receivedItems: { product_id: string; quantity_received: number }[], userId: string) {
    if (isUsingMockData) {
      storage.receiveGoods(purchaseId, receivedItems.map(i => ({ productId: i.product_id, quantityReceived: i.quantity_received })), 'Dev Operator');
      return;
    }
    return purchasesRepo.receiveGoods(businessId, purchaseId, receivedItems, userId);
  },

  async recordSupplierReturn(businessId: string, purchaseId: string, returnedItems: { product_id: string; quantity: number }[], reason: string, userId: string) {
    if (isUsingMockData) {
      storage.recordSupplierReturn(purchaseId, returnedItems.map(i => ({ productId: i.product_id, quantity: i.quantity })), reason, 'Dev Operator');
      return;
    }
    return purchasesRepo.recordSupplierReturn(businessId, purchaseId, returnedItems, reason, userId);
  },

  // --- REPORTS ---
  async getStockMovements(businessId: string): Promise<DbStockMovement[]> {
    if (isUsingMockData) {
      const mock = storage.getStockLogs();
      return mock.map((m) => ({
        id: m.id,
        business_id: businessId,
        product_id: m.productId,
        movement_type: m.type as any,
        change_qty: m.changeQty,
        previous_stock: m.previousStock,
        new_stock: m.newStock,
        reason: m.reason,
        reference_id: m.referenceId,
        created_at: m.timestamp,
        product: { name: m.productName, sku: m.sku, uom: 'pcs' } as any
      }));
    }
    return reportsRepo.getStockMovements(businessId);
  },

  async getReceivablesAging(businessId: string) {
    if (isUsingMockData) {
      const invoices = storage.getInvoices();
      const buckets = { current: 0, aging16_30: 0, aging31_60: 0, over60: 0 };
      const now = new Date();
      invoices.filter(i => i.balanceDue > 0 && i.status !== 'cancelled').forEach((inv) => {
        const diff = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
        if (diff <= 15) buckets.current += inv.balanceDue;
        else if (diff <= 30) buckets.aging16_30 += inv.balanceDue;
        else if (diff <= 60) buckets.aging31_60 += inv.balanceDue;
        else buckets.over60 += inv.balanceDue;
      });
      return buckets;
    }
    return reportsRepo.getReceivablesAging(businessId);
  }
};
