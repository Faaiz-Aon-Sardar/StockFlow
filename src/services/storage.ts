/**
 * StockFlow Data Access Layer (DAL) & LocalStorage Repository
 * Provides consistent, typed data access for all wholesale operations.
 */

import {
  Product,
  Customer,
  Supplier,
  SalesOrder,
  Dispatch,
  Invoice,
  Payment,
  PurchaseOrder,
  StockMovement,
  BusinessSettings,
  StaffMember,
  StaffRole,
  OrderItem,
  TaxBreakdown
} from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'stockflow_products_v2',
  CUSTOMERS: 'stockflow_customers_v2',
  SUPPLIERS: 'stockflow_suppliers_v2',
  ORDERS: 'stockflow_orders_v2',
  DISPATCHES: 'stockflow_dispatches_v2',
  INVOICES: 'stockflow_invoices_v2',
  PAYMENTS: 'stockflow_payments_v2',
  PURCHASES: 'stockflow_purchases_v2',
  STOCK_LOGS: 'stockflow_stock_logs_v2',
  SETTINGS: 'stockflow_settings_v2',
  STAFF: 'stockflow_staff_v2',
  ACTIVE_ROLE: 'stockflow_active_role_v2',
  INITIALIZED: 'stockflow_initialized_v2'
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: 'StockFlow Dist. Agencies Pvt. Ltd.',
  tradeName: 'StockFlow Wholesale Hub',
  gstin: '27AABCS1429B1Z8',
  panNumber: 'AABCS1429B',
  phone: '+91 98200 45678',
  email: 'operations@stockflowhub.com',
  website: 'https://stockflowhub.com',
  address: 'Plot 42, Sector 18, Vashi APMC Grain Market, Navi Mumbai, Maharashtra 400703',
  state: 'Maharashtra',
  stateCode: '27',
  bankName: 'HDFC Bank Ltd.',
  accountNo: '50200041289345',
  ifscCode: 'HDFC0000240',
  branchName: 'APMC Market Branch, Vashi',
  upiId: 'stockflow@hdfcbank',
  currencySymbol: '₹',
  currencyCode: 'INR',
  defaultPaymentTerms: 'net_15',
  invoicePrefix: 'INV-2026-',
  orderPrefix: 'SO-',
  purchasePrefix: 'PO-',
  dispatchPrefix: 'DSP-',
  paymentPrefix: 'RCP-',
  valuationMethod: 'fifo'
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'FMCG-OIL-01',
    name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
    category: 'Edible Oils',
    description: 'High quality refined sunflower oil, 100% pure with Vitamin A & D',
    uom: 'ltr',
    purchaseCost: 112.50,
    defaultSellingPrice: 135.00,
    wholesaleTiers: [
      { minQty: 24, unitPrice: 130.00 },
      { minQty: 100, unitPrice: 126.00 }
    ],
    currentStock: 340,
    reservedStock: 48,
    reorderLevel: 80,
    hsnCode: '1512',
    gstRate: 5,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z'
  },
  {
    id: 'prod-002',
    sku: 'FMCG-RICE-05',
    name: 'Daawat Rozana Gold Basmati Rice (5 kg Bag)',
    category: 'Grains & Pulses',
    description: 'Aromatic aged Basmati rice suitable for daily household & catering use',
    uom: 'box',
    purchaseCost: 380.00,
    defaultSellingPrice: 460.00,
    wholesaleTiers: [
      { minQty: 10, unitPrice: 440.00 },
      { minQty: 50, unitPrice: 420.00 }
    ],
    currentStock: 125,
    reservedStock: 20,
    reorderLevel: 30,
    hsnCode: '1006',
    gstRate: 5,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-22T14:30:00Z'
  },
  {
    id: 'prod-003',
    sku: 'FMCG-SALT-01',
    name: 'Tata Salt Vacuum Evaporated Iodised (1 kg Pack)',
    category: 'Staples',
    description: "India's leading vacuum evaporated iodised salt in tamper-evident packing",
    uom: 'kg',
    purchaseCost: 21.00,
    defaultSellingPrice: 28.00,
    wholesaleTiers: [
      { minQty: 50, unitPrice: 26.00 },
      { minQty: 200, unitPrice: 24.50 }
    ],
    currentStock: 520,
    reservedStock: 100,
    reorderLevel: 150,
    hsnCode: '2501',
    gstRate: 0,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-18T11:00:00Z'
  },
  {
    id: 'prod-004',
    sku: 'FMCG-TEA-500',
    name: 'Brooke Bond Red Label Strong CTC Tea (500g Box)',
    category: 'Beverages',
    description: 'Carefully selected tea leaves for rich taste, color and aroma',
    uom: 'pcs',
    purchaseCost: 220.00,
    defaultSellingPrice: 275.00,
    wholesaleTiers: [
      { minQty: 20, unitPrice: 260.00 },
      { minQty: 80, unitPrice: 250.00 }
    ],
    currentStock: 95,
    reservedStock: 15,
    reorderLevel: 25,
    hsnCode: '0902',
    gstRate: 5,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-21T09:15:00Z'
  },
  {
    id: 'prod-005',
    sku: 'FMCG-MAGGI-BOX',
    name: 'Maggi 2-Minute Masala Instant Noodles (70g x 24 Carton)',
    category: 'Packaged Foods',
    description: 'Wholesale carton containing 24 individual retail packs with tastemaker',
    uom: 'box',
    purchaseCost: 290.00,
    defaultSellingPrice: 360.00,
    wholesaleTiers: [
      { minQty: 10, unitPrice: 345.00 },
      { minQty: 50, unitPrice: 330.00 }
    ],
    currentStock: 42,
    reservedStock: 12,
    reorderLevel: 20,
    hsnCode: '1902',
    gstRate: 12,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-24T16:00:00Z'
  },
  {
    id: 'prod-006',
    sku: 'FMCG-PARLE-CTN',
    name: 'Parle-G Glucose Biscuits (800g Family Pack x 12 Master Ctn)',
    category: 'Confectionery & Biscuits',
    description: 'Master carton containing 12 jumbo family packs of iconic glucose biscuits',
    uom: 'crate',
    purchaseCost: 740.00,
    defaultSellingPrice: 900.00,
    wholesaleTiers: [
      { minQty: 5, unitPrice: 870.00 },
      { minQty: 25, unitPrice: 840.00 }
    ],
    currentStock: 28,
    reservedStock: 4,
    reorderLevel: 15,
    hsnCode: '1905',
    gstRate: 18,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-23T11:45:00Z'
  },
  {
    id: 'prod-007',
    sku: 'FMCG-BRIT-GD',
    name: 'Britannia Good Day Butter Cookies (600g Tin Pack)',
    category: 'Confectionery & Biscuits',
    description: 'Rich buttery cookies with cashew flakes, premium tin gift presentation',
    uom: 'pcs',
    purchaseCost: 155.00,
    defaultSellingPrice: 199.00,
    wholesaleTiers: [
      { minQty: 24, unitPrice: 185.00 },
      { minQty: 120, unitPrice: 175.00 }
    ],
    currentStock: 14,
    reservedStock: 0,
    reorderLevel: 30, // low stock
    hsnCode: '1905',
    gstRate: 18,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-25T13:20:00Z'
  },
  {
    id: 'prod-008',
    sku: 'FMCG-DET-REFILL',
    name: 'Dettol Original Germ Protection Liquid Handwash (750ml Refill)',
    category: 'Personal & Home Care',
    description: 'Antibacterial handwash pouch refill with pine fragrance',
    uom: 'pcs',
    purchaseCost: 98.00,
    defaultSellingPrice: 139.00,
    wholesaleTiers: [
      { minQty: 30, unitPrice: 125.00 },
      { minQty: 100, unitPrice: 118.00 }
    ],
    currentStock: 110,
    reservedStock: 25,
    reorderLevel: 40,
    hsnCode: '3401',
    gstRate: 18,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-20T17:00:00Z'
  },
  {
    id: 'prod-009',
    sku: 'FMCG-SURF-BAR',
    name: 'Surf Excel Stain Eraser Detergent Bar (250g x 48 Case)',
    category: 'Personal & Home Care',
    description: 'Wholesale bulk case of 48 powerful stain-removing detergent bars',
    uom: 'box',
    purchaseCost: 1180.00,
    defaultSellingPrice: 1440.00,
    wholesaleTiers: [
      { minQty: 5, unitPrice: 1390.00 },
      { minQty: 20, unitPrice: 1340.00 }
    ],
    currentStock: 18,
    reservedStock: 0,
    reorderLevel: 25, // low stock
    hsnCode: '3402',
    gstRate: 18,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-22T10:10:00Z'
  },
  {
    id: 'prod-010',
    sku: 'FMCG-CAD-DAIRY',
    name: 'Cadbury Dairy Milk Chocolate Bites (500g Jar)',
    category: 'Confectionery & Biscuits',
    description: 'Smooth milk chocolate mini bars in sealed counter-top retail jar',
    uom: 'pcs',
    purchaseCost: 260.00,
    defaultSellingPrice: 325.00,
    wholesaleTiers: [
      { minQty: 12, unitPrice: 305.00 },
      { minQty: 48, unitPrice: 290.00 }
    ],
    currentStock: 8,
    reservedStock: 0,
    reorderLevel: 20, // very low stock
    hsnCode: '1806',
    gstRate: 18,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-25T15:00:00Z'
  },
  {
    id: 'prod-011',
    sku: 'FMCG-ATTA-10',
    name: 'Aashirvaad Shudh Chakki Whole Wheat Atta (10 kg Bag)',
    category: 'Grains & Pulses',
    description: '100% whole wheat flour ground using traditional stone chakki',
    uom: 'box',
    purchaseCost: 395.00,
    defaultSellingPrice: 475.00,
    wholesaleTiers: [
      { minQty: 15, unitPrice: 450.00 },
      { minQty: 60, unitPrice: 435.00 }
    ],
    currentStock: 85,
    reservedStock: 10,
    reorderLevel: 25,
    hsnCode: '1101',
    gstRate: 5,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-26T12:00:00Z'
  },
  {
    id: 'prod-012',
    sku: 'FMCG-AMUL-GHEE',
    name: 'Amul Pure Ghee Poly Pouch (1 Litre)',
    category: 'Dairy & Ghee',
    description: 'Traditional aroma and granular texture, rich in fat-soluble vitamins',
    uom: 'ltr',
    purchaseCost: 510.00,
    defaultSellingPrice: 620.00,
    wholesaleTiers: [
      { minQty: 12, unitPrice: 595.00 },
      { minQty: 48, unitPrice: 575.00 }
    ],
    currentStock: 64,
    reservedStock: 6,
    reorderLevel: 20,
    hsnCode: '0405',
    gstRate: 12,
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-26T14:40:00Z'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    code: 'CUST-MUM-01',
    name: 'Shree Ganesh Retail Mart',
    contactPerson: 'Ramesh Patel',
    phone: '+91 98211 23456',
    email: 'ganeshretail@gmail.com',
    billingAddress: 'Shop 12-14, Laxmi Market, Dadar West, Mumbai 400028',
    shippingAddress: 'Shop 12-14, Laxmi Market, Dadar West, Mumbai 400028',
    gstin: '27AABCP8921K1Z2',
    paymentTerms: 'net_15',
    creditLimit: 150000,
    openingBalance: 0,
    currentOutstanding: 42350,
    notes: 'Long-standing customer, prompt NEFT settlement',
    status: 'active',
    createdAt: '2026-08-15T10:00:00Z'
  },
  {
    id: 'cust-002',
    code: 'CUST-THN-02',
    name: 'Krishna Provisions & General Store',
    contactPerson: 'Suresh Choudhary',
    phone: '+91 98199 87654',
    email: 'krishnaprovisions@yahoo.com',
    billingAddress: 'Gala 4, Opp. Station Road, Naupada, Thane West 400602',
    shippingAddress: 'Gala 4, Opp. Station Road, Naupada, Thane West 400602',
    gstin: '27AAECP1123P1Z9',
    paymentTerms: 'net_7',
    creditLimit: 80000,
    openingBalance: 0,
    currentOutstanding: 28400,
    notes: 'Weekly dispatch via tempo, pays via UPI',
    status: 'active',
    createdAt: '2026-08-20T11:30:00Z'
  },
  {
    id: 'cust-003',
    code: 'CUST-NAV-03',
    name: 'Mahalaxmi Supermarket Pvt. Ltd.',
    contactPerson: 'Mahesh Gupta',
    phone: '+91 99201 34567',
    email: 'accounts@mahalaxmimart.in',
    billingAddress: 'Sector 19A, Nerul West, Navi Mumbai 400706',
    shippingAddress: 'Sector 19A, Nerul West, Navi Mumbai 400706',
    gstin: '27AABCM6743J1ZQ',
    paymentTerms: 'net_30',
    creditLimit: 300000,
    openingBalance: 12000,
    currentOutstanding: 89600,
    notes: 'Large 3-store chain, strict PO and tax invoice matching required',
    status: 'active',
    createdAt: '2026-09-02T14:00:00Z'
  },
  {
    id: 'cust-004',
    code: 'CUST-PUN-04',
    name: 'Sai Baba Superstore & Kirana',
    contactPerson: 'Santosh Shinde',
    phone: '+91 97654 32109',
    email: 'saibabakirana@rediffmail.com',
    billingAddress: 'Main Bazar, Chakan, Pune District 410501',
    shippingAddress: 'Main Bazar, Chakan, Pune District 410501',
    gstin: '27AAZPS9812M1Z5',
    paymentTerms: 'net_7',
    creditLimit: 60000,
    openingBalance: 0,
    currentOutstanding: 14750,
    notes: 'Semi-wholesale distributor for surrounding villages',
    status: 'active',
    createdAt: '2026-09-10T16:20:00Z'
  },
  {
    id: 'cust-005',
    code: 'CUST-MUM-05',
    name: 'Apex Mini Mart (Express Stores)',
    contactPerson: 'Vikram Joshi',
    phone: '+91 98333 45678',
    email: 'vjoshi@apexminimart.com',
    billingAddress: 'Building 7, Andheri Kurla Road, Chakala, Andheri East 400093',
    shippingAddress: 'Central Warehouse, Sakinaka, Mumbai 400072',
    gstin: '27AAACA9928H1ZV',
    paymentTerms: 'net_15',
    creditLimit: 200000,
    openingBalance: 0,
    currentOutstanding: 0,
    notes: 'Clean payment history, prefers consolidated monthly invoicing',
    status: 'active',
    createdAt: '2026-09-15T09:40:00Z'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-001',
    code: 'SUP-AW-01',
    name: 'Adani Wilmar Limited Depot',
    contactPerson: 'Sanjay Nair',
    phone: '+91 22 2784 1000',
    email: 'mumbai.depot@adaniwilmar.in',
    address: 'Depot 14, JNPT Logistics Park, Uran, Raigad 400702',
    gstin: '27AAACA1234D1ZP',
    paymentTerms: 'net_15',
    openingBalance: 0,
    currentOutstanding: 68400,
    notes: 'Direct manufacturer supply of Fortune branded oils and specialty fats',
    status: 'active',
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'sup-002',
    code: 'SUP-HUL-02',
    name: 'Hindustan Unilever Clearing & Forwarding',
    contactPerson: 'Anand Rathi',
    phone: '+91 22 3983 0000',
    email: 'orders.western@hulcf.com',
    address: 'Godown 8, Bhiwandi Warehousing Zone, Thane 421302',
    gstin: '27AAACH2345E1ZQ',
    paymentTerms: 'net_7',
    openingBalance: 0,
    currentOutstanding: 45200,
    notes: 'Primary C&F agent for Surf Excel, Lifebuoy, Red Label Tea',
    status: 'active',
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'sup-003',
    code: 'SUP-NES-03',
    name: 'Nestlé India Regional Distribution Center',
    contactPerson: 'Deepak Varma',
    phone: '+91 22 2650 4400',
    email: 'rdc.mumbai@in.nestle.com',
    address: 'Plot B-11, TTC Industrial Area, Turbhe, Navi Mumbai 400705',
    gstin: '27AAACN3456F1ZR',
    paymentTerms: 'net_15',
    openingBalance: 0,
    currentOutstanding: 32600,
    notes: 'Maggi noodles, KitKat, Nescafe bulk supplies',
    status: 'active',
    createdAt: '2026-08-05T08:00:00Z'
  },
  {
    id: 'sup-004',
    code: 'SUP-BRIT-04',
    name: 'Britannia Industries Regional Clearing Depot',
    contactPerson: 'Pravin Jadhav',
    phone: '+91 22 2778 2200',
    email: 'clearing.navi@britannia.co.in',
    address: 'Kalyan Shil Road, Dombivli East 421204',
    gstin: '27AAACB4567G1ZS',
    paymentTerms: 'net_7',
    openingBalance: 0,
    currentOutstanding: 0,
    notes: 'Good Day, Marie Gold, Bourbon bulk crates',
    status: 'active',
    createdAt: '2026-08-08T08:00:00Z'
  }
];

export const INITIAL_ORDERS: SalesOrder[] = [
  {
    id: 'ord-1001',
    orderNumber: 'SO-2026-0142',
    customerId: 'cust-001',
    customerName: 'Shree Ganesh Retail Mart',
    customerPhone: '+91 98211 23456',
    customerGstin: '27AABCP8921K1Z2',
    orderDate: '2026-10-24',
    expectedDeliveryDate: '2026-10-26',
    items: [
      {
        productId: 'prod-001',
        sku: 'FMCG-OIL-01',
        name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
        uom: 'ltr',
        quantity: 48,
        unitPrice: 130.00,
        discountPercent: 2,
        discountAmount: 124.80,
        taxRate: 5,
        taxAmount: 305.76,
        lineTotal: 6420.96,
        hsnCode: '1512'
      },
      {
        productId: 'prod-002',
        sku: 'FMCG-RICE-05',
        name: 'Daawat Rozana Gold Basmati Rice (5 kg Bag)',
        uom: 'box',
        quantity: 20,
        unitPrice: 440.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 440.00,
        lineTotal: 9240.00,
        hsnCode: '1006'
      },
      {
        productId: 'prod-005',
        sku: 'FMCG-MAGGI-BOX',
        name: 'Maggi 2-Minute Masala Instant Noodles (70g x 24 Carton)',
        uom: 'box',
        quantity: 12,
        unitPrice: 345.00,
        discountPercent: 1.5,
        discountAmount: 62.10,
        taxRate: 12,
        taxAmount: 489.35,
        lineTotal: 4567.25,
        hsnCode: '1902'
      }
    ],
    subtotal: 19440.00,
    discountTotal: 186.90,
    taxTotal: 1235.11,
    grandTotal: 20488.21,
    status: 'dispatched',
    paymentStatus: 'paid',
    dispatchedQty: 80,
    totalQty: 80,
    notes: 'Urgent festival stock for Diwali rush. Deliver before 4 PM.',
    createdAt: '2026-10-24T09:30:00Z'
  },
  {
    id: 'ord-1002',
    orderNumber: 'SO-2026-0143',
    customerId: 'cust-003',
    customerName: 'Mahalaxmi Supermarket Pvt. Ltd.',
    customerPhone: '+91 99201 34567',
    customerGstin: '27AABCM6743J1ZQ',
    orderDate: '2026-10-25',
    expectedDeliveryDate: '2026-10-27',
    items: [
      {
        productId: 'prod-003',
        sku: 'FMCG-SALT-01',
        name: 'Tata Salt Vacuum Evaporated Iodised (1 kg Pack)',
        uom: 'kg',
        quantity: 100,
        unitPrice: 26.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 2600.00,
        hsnCode: '2501'
      },
      {
        productId: 'prod-008',
        sku: 'FMCG-DET-REFILL',
        name: 'Dettol Original Germ Protection Liquid Handwash (750ml Refill)',
        uom: 'pcs',
        quantity: 25,
        unitPrice: 125.00,
        discountPercent: 3,
        discountAmount: 93.75,
        taxRate: 18,
        taxAmount: 545.63,
        lineTotal: 3576.88,
        hsnCode: '3401'
      },
      {
        productId: 'prod-011',
        sku: 'FMCG-ATTA-10',
        name: 'Aashirvaad Shudh Chakki Whole Wheat Atta (10 kg Bag)',
        uom: 'box',
        quantity: 10,
        unitPrice: 450.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 225.00,
        lineTotal: 4725.00,
        hsnCode: '1101'
      }
    ],
    subtotal: 10225.00,
    discountTotal: 93.75,
    taxTotal: 770.63,
    grandTotal: 10901.88,
    status: 'confirmed',
    paymentStatus: 'unpaid',
    dispatchedQty: 0,
    totalQty: 135,
    notes: 'Awaiting tempo scheduling for delivery tomorrow morning',
    createdAt: '2026-10-25T11:15:00Z'
  },
  {
    id: 'ord-1003',
    orderNumber: 'SO-2026-0144',
    customerId: 'cust-002',
    customerName: 'Krishna Provisions & General Store',
    customerPhone: '+91 98199 87654',
    customerGstin: '27AAECP1123P1Z9',
    orderDate: '2026-10-26',
    expectedDeliveryDate: '2026-10-28',
    items: [
      {
        productId: 'prod-004',
        sku: 'FMCG-TEA-500',
        name: 'Brooke Bond Red Label Strong CTC Tea (500g Box)',
        uom: 'pcs',
        quantity: 15,
        unitPrice: 260.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 195.00,
        lineTotal: 4095.00,
        hsnCode: '0902'
      },
      {
        productId: 'prod-006',
        sku: 'FMCG-PARLE-CTN',
        name: 'Parle-G Glucose Biscuits (800g Family Pack x 12 Master Ctn)',
        uom: 'crate',
        quantity: 4,
        unitPrice: 870.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 18,
        taxAmount: 626.40,
        lineTotal: 4106.40,
        hsnCode: '1905'
      },
      {
        productId: 'prod-012',
        sku: 'FMCG-AMUL-GHEE',
        name: 'Amul Pure Ghee Poly Pouch (1 Litre)',
        uom: 'ltr',
        quantity: 6,
        unitPrice: 595.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 12,
        taxAmount: 428.40,
        lineTotal: 3998.40,
        hsnCode: '0405'
      }
    ],
    subtotal: 10950.00,
    discountTotal: 0,
    taxTotal: 1249.80,
    grandTotal: 12199.80,
    status: 'confirmed',
    paymentStatus: 'unpaid',
    dispatchedQty: 0,
    totalQty: 25,
    notes: 'Confirm stock before loading onto Thane local carrier',
    createdAt: '2026-10-26T14:00:00Z'
  },
  {
    id: 'ord-1004',
    orderNumber: 'SO-2026-0145',
    customerId: 'cust-004',
    customerName: 'Sai Baba Superstore & Kirana',
    customerPhone: '+91 97654 32109',
    customerGstin: '27AAZPS9812M1Z5',
    orderDate: '2026-10-27',
    expectedDeliveryDate: '2026-10-29',
    items: [
      {
        productId: 'prod-001',
        sku: 'FMCG-OIL-01',
        name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
        uom: 'ltr',
        quantity: 24,
        unitPrice: 130.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 156.00,
        lineTotal: 3276.00,
        hsnCode: '1512'
      }
    ],
    subtotal: 3120.00,
    discountTotal: 0,
    taxTotal: 156.00,
    grandTotal: 3276.00,
    status: 'draft',
    paymentStatus: 'unpaid',
    dispatchedQty: 0,
    totalQty: 24,
    notes: 'Draft order phone booking; waiting for deposit confirmation',
    createdAt: '2026-10-27T08:15:00Z'
  }
];

export const INITIAL_DISPATCHES: Dispatch[] = [
  {
    id: 'dsp-001',
    dispatchNumber: 'DSP-2026-0089',
    orderId: 'ord-1001',
    orderNumber: 'SO-2026-0142',
    customerId: 'cust-001',
    customerName: 'Shree Ganesh Retail Mart',
    shippingAddress: 'Shop 12-14, Laxmi Market, Dadar West, Mumbai 400028',
    dispatchDate: '2026-10-25',
    carrierName: 'Jai Maharashtra Logistics (Tempo MH-04-EK-4592)',
    vehicleOrTrackingNo: 'MH-04-EK-4592',
    items: [
      {
        productId: 'prod-001',
        sku: 'FMCG-OIL-01',
        name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
        uom: 'ltr',
        quantityOrdered: 48,
        quantityDispatched: 48
      },
      {
        productId: 'prod-002',
        sku: 'FMCG-RICE-05',
        name: 'Daawat Rozana Gold Basmati Rice (5 kg Bag)',
        uom: 'box',
        quantityOrdered: 20,
        quantityDispatched: 20
      },
      {
        productId: 'prod-005',
        sku: 'FMCG-MAGGI-BOX',
        name: 'Maggi 2-Minute Masala Instant Noodles (70g x 24 Carton)',
        uom: 'box',
        quantityOrdered: 12,
        quantityDispatched: 12
      }
    ],
    status: 'delivered',
    notes: 'Signed delivery challan verified by store keeper Ramesh',
    createdAt: '2026-10-25T14:30:00Z'
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2026-0091',
    orderId: 'ord-1001',
    orderNumber: 'SO-2026-0142',
    customerId: 'cust-001',
    customerName: 'Shree Ganesh Retail Mart',
    customerGstin: '27AABCP8921K1Z2',
    billingAddress: 'Shop 12-14, Laxmi Market, Dadar West, Mumbai 400028',
    shippingAddress: 'Shop 12-14, Laxmi Market, Dadar West, Mumbai 400028',
    issueDate: '2026-10-24',
    dueDate: '2026-11-08',
    items: INITIAL_ORDERS[0].items,
    subtotal: 19440.00,
    discountTotal: 186.90,
    taxBreakdown: [
      { rate: 5, taxableAmount: 15035.20, cgst: 375.88, sgst: 375.88, igst: 0 },
      { rate: 12, taxableAmount: 4077.90, cgst: 244.67, sgst: 244.67, igst: 0 }
    ],
    taxTotal: 1235.11,
    grandTotal: 20488.21,
    amountPaid: 20488.21,
    balanceDue: 0,
    status: 'paid',
    paymentTerms: 'Net 15 Days',
    notes: 'Thank you for your business. Goods once sold will not be taken back after 7 days.',
    createdAt: '2026-10-24T10:00:00Z'
  },
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2026-0082',
    customerId: 'cust-001',
    customerName: 'Shree Ganesh Retail Mart',
    customerGstin: '27AABCP8921K1Z2',
    billingAddress: 'Shop 12-14, Laxmi Market, Dadar West, Mumbai 400028',
    shippingAddress: 'Shop 12-14, Laxmi Market, Dadar West, Mumbai 400028',
    issueDate: '2026-10-10',
    dueDate: '2026-10-25',
    items: [
      {
        productId: 'prod-001',
        sku: 'FMCG-OIL-01',
        name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
        uom: 'ltr',
        quantity: 100,
        unitPrice: 126.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 630.00,
        lineTotal: 13230.00,
        hsnCode: '1512'
      },
      {
        productId: 'prod-004',
        sku: 'FMCG-TEA-500',
        name: 'Brooke Bond Red Label Strong CTC Tea (500g Box)',
        uom: 'pcs',
        quantity: 80,
        unitPrice: 250.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 1000.00,
        lineTotal: 21000.00,
        hsnCode: '0902'
      },
      {
        productId: 'prod-007',
        sku: 'FMCG-BRIT-GD',
        name: 'Britannia Good Day Butter Cookies (600g Tin Pack)',
        uom: 'pcs',
        quantity: 40,
        unitPrice: 185.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 18,
        taxAmount: 1332.00,
        lineTotal: 8732.00,
        hsnCode: '1905'
      }
    ],
    subtotal: 40000.00,
    discountTotal: 0,
    taxBreakdown: [
      { rate: 5, taxableAmount: 32600.00, cgst: 815.00, sgst: 815.00, igst: 0 },
      { rate: 18, taxableAmount: 7400.00, cgst: 666.00, sgst: 666.00, igst: 0 }
    ],
    taxTotal: 2962.00,
    grandTotal: 42962.00,
    amountPaid: 612.00,
    balanceDue: 42350.00,
    status: 'overdue',
    paymentTerms: 'Net 15 Days',
    notes: 'Payment overdue by 2 days. Follow-up reminder sent.',
    createdAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'inv-003',
    invoiceNumber: 'INV-2026-0085',
    customerId: 'cust-002',
    customerName: 'Krishna Provisions & General Store',
    customerGstin: '27AAECP1123P1Z9',
    billingAddress: 'Gala 4, Opp. Station Road, Naupada, Thane West 400602',
    shippingAddress: 'Gala 4, Opp. Station Road, Naupada, Thane West 400602',
    issueDate: '2026-10-18',
    dueDate: '2026-10-25',
    items: [
      {
        productId: 'prod-002',
        sku: 'FMCG-RICE-05',
        name: 'Daawat Rozana Gold Basmati Rice (5 kg Bag)',
        uom: 'box',
        quantity: 50,
        unitPrice: 420.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 1050.00,
        lineTotal: 22050.00,
        hsnCode: '1006'
      },
      {
        productId: 'prod-003',
        sku: 'FMCG-SALT-01',
        name: 'Tata Salt Vacuum Evaporated Iodised (1 kg Pack)',
        uom: 'kg',
        quantity: 200,
        unitPrice: 24.50,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        lineTotal: 4900.00,
        hsnCode: '2501'
      },
      {
        productId: 'prod-008',
        sku: 'FMCG-DET-REFILL',
        name: 'Dettol Original Germ Protection Liquid Handwash (750ml Refill)',
        uom: 'pcs',
        quantity: 12,
        unitPrice: 125.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 18,
        taxAmount: 270.00,
        lineTotal: 1770.00,
        hsnCode: '3401'
      }
    ],
    subtotal: 27400.00,
    discountTotal: 0,
    taxBreakdown: [
      { rate: 0, taxableAmount: 4900.00, cgst: 0, sgst: 0, igst: 0 },
      { rate: 5, taxableAmount: 21000.00, cgst: 525.00, sgst: 525.00, igst: 0 },
      { rate: 18, taxableAmount: 1500.00, cgst: 135.00, sgst: 135.00, igst: 0 }
    ],
    taxTotal: 1320.00,
    grandTotal: 28720.00,
    amountPaid: 320.00,
    balanceDue: 28400.00,
    status: 'overdue',
    paymentTerms: 'Net 7 Days',
    notes: 'Customer promised cheque on 28th October.',
    createdAt: '2026-10-18T14:00:00Z'
  },
  {
    id: 'inv-004',
    invoiceNumber: 'INV-2026-0089',
    customerId: 'cust-003',
    customerName: 'Mahalaxmi Supermarket Pvt. Ltd.',
    customerGstin: '27AABCM6743J1ZQ',
    billingAddress: 'Sector 19A, Nerul West, Navi Mumbai 400706',
    shippingAddress: 'Sector 19A, Nerul West, Navi Mumbai 400706',
    issueDate: '2026-10-21',
    dueDate: '2026-11-20',
    items: [
      {
        productId: 'prod-006',
        sku: 'FMCG-PARLE-CTN',
        name: 'Parle-G Glucose Biscuits (800g Family Pack x 12 Master Ctn)',
        uom: 'crate',
        quantity: 25,
        unitPrice: 840.00,
        discountPercent: 2,
        discountAmount: 420.00,
        taxRate: 18,
        taxAmount: 3704.40,
        lineTotal: 24284.40,
        hsnCode: '1905'
      },
      {
        productId: 'prod-009',
        sku: 'FMCG-SURF-BAR',
        name: 'Surf Excel Stain Eraser Detergent Bar (250g x 48 Case)',
        uom: 'box',
        quantity: 20,
        unitPrice: 1340.00,
        discountPercent: 2,
        discountAmount: 536.00,
        taxRate: 18,
        taxAmount: 4727.52,
        lineTotal: 30991.52,
        hsnCode: '3402'
      },
      {
        productId: 'prod-012',
        sku: 'FMCG-AMUL-GHEE',
        name: 'Amul Pure Ghee Poly Pouch (1 Litre)',
        uom: 'ltr',
        quantity: 48,
        unitPrice: 575.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 12,
        taxAmount: 3312.00,
        lineTotal: 30912.00,
        hsnCode: '0405'
      }
    ],
    subtotal: 75400.00,
    discountTotal: 956.00,
    taxBreakdown: [
      { rate: 12, taxableAmount: 27600.00, cgst: 1656.00, sgst: 1656.00, igst: 0 },
      { rate: 18, taxableAmount: 46844.00, cgst: 4215.96, sgst: 4215.96, igst: 0 }
    ],
    taxTotal: 11743.92,
    grandTotal: 86187.92,
    amountPaid: 0,
    balanceDue: 86187.92,
    status: 'issued',
    paymentTerms: 'Net 30 Days',
    notes: 'Regular monthly supply. Payment via RTGS due Nov 20.',
    createdAt: '2026-10-21T15:30:00Z'
  },
  {
    id: 'inv-005',
    invoiceNumber: 'INV-2026-0090',
    customerId: 'cust-004',
    customerName: 'Sai Baba Superstore & Kirana',
    customerGstin: '27AAZPS9812M1Z5',
    billingAddress: 'Main Bazar, Chakan, Pune District 410501',
    shippingAddress: 'Main Bazar, Chakan, Pune District 410501',
    issueDate: '2026-10-23',
    dueDate: '2026-10-30',
    items: [
      {
        productId: 'prod-001',
        sku: 'FMCG-OIL-01',
        name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
        uom: 'ltr',
        quantity: 50,
        unitPrice: 130.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 325.00,
        lineTotal: 6825.00,
        hsnCode: '1512'
      },
      {
        productId: 'prod-011',
        sku: 'FMCG-ATTA-10',
        name: 'Aashirvaad Shudh Chakki Whole Wheat Atta (10 kg Bag)',
        uom: 'box',
        quantity: 15,
        unitPrice: 450.00,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxAmount: 337.50,
        lineTotal: 7087.50,
        hsnCode: '1101'
      }
    ],
    subtotal: 13250.00,
    discountTotal: 0,
    taxBreakdown: [
      { rate: 5, taxableAmount: 13250.00, cgst: 331.25, sgst: 331.25, igst: 0 }
    ],
    taxTotal: 662.50,
    grandTotal: 13912.50,
    amountPaid: 0,
    balanceDue: 13912.50,
    status: 'issued',
    paymentTerms: 'Net 7 Days',
    notes: 'Direct tempo dispatch to Pune rural depot.',
    createdAt: '2026-10-23T11:00:00Z'
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-001',
    paymentNumber: 'RCP-2026-0054',
    date: '2026-10-27',
    partyType: 'customer',
    partyId: 'cust-001',
    partyName: 'Shree Ganesh Retail Mart',
    amount: 20488.21,
    method: 'bank_transfer',
    referenceNo: 'HDFCN26289012431',
    allocations: [
      {
        invoiceId: 'inv-001',
        invoiceNumber: 'INV-2026-0091',
        amountAllocated: 20488.21
      }
    ],
    notes: 'Full clearance of invoice INV-2026-0091 via NEFT',
    createdAt: '2026-10-27T07:45:00Z'
  },
  {
    id: 'pay-002',
    paymentNumber: 'RCP-2026-0053',
    date: '2026-10-27',
    partyType: 'customer',
    partyId: 'cust-005',
    partyName: 'Apex Mini Mart (Express Stores)',
    amount: 35000.00,
    method: 'upi',
    referenceNo: 'UPI/329841029312',
    allocations: [],
    notes: 'Advance deposit against upcoming November orders',
    createdAt: '2026-10-27T06:30:00Z'
  },
  {
    id: 'pay-003',
    paymentNumber: 'RCP-2026-0051',
    date: '2026-10-26',
    partyType: 'customer',
    partyId: 'cust-002',
    partyName: 'Krishna Provisions & General Store',
    amount: 15000.00,
    method: 'cash',
    referenceNo: 'CASH-REC-1026',
    allocations: [
      {
        invoiceId: 'inv-003',
        invoiceNumber: 'INV-2026-0085',
        amountAllocated: 15000.00
      }
    ],
    notes: 'Partial payment deposited at counter by storekeeper',
    createdAt: '2026-10-26T17:15:00Z'
  },
  {
    id: 'pay-004',
    paymentNumber: 'PAY-2026-0038',
    date: '2026-10-25',
    partyType: 'supplier',
    partyId: 'sup-001',
    partyName: 'Adani Wilmar Limited Depot',
    amount: 50000.00,
    method: 'bank_transfer',
    referenceNo: 'RTGS/HDFC/9812401',
    allocations: [],
    notes: 'Vendor payment towards Fortune oil bulk invoice',
    createdAt: '2026-10-25T13:00:00Z'
  }
];

export const INITIAL_PURCHASES: PurchaseOrder[] = [
  {
    id: 'po-001',
    purchaseRef: 'PO-2026-0041',
    supplierId: 'sup-001',
    supplierName: 'Adani Wilmar Limited Depot',
    orderDate: '2026-10-22',
    expectedDate: '2026-10-25',
    receivedDate: '2026-10-25',
    items: [
      {
        productId: 'prod-001',
        sku: 'FMCG-OIL-01',
        name: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
        uom: 'ltr',
        quantityOrdered: 300,
        quantityReceived: 300,
        unitCost: 112.50,
        taxRate: 5,
        taxAmount: 1687.50,
        lineTotal: 35437.50,
        hsnCode: '1512'
      }
    ],
    subtotal: 33750.00,
    taxTotal: 1687.50,
    grandTotal: 35437.50,
    amountPaid: 35437.50,
    balanceDue: 0,
    status: 'received',
    paymentStatus: 'paid',
    notes: 'Received in full. Batch 8921-AW-OCT, expiry Oct 2027.',
    createdAt: '2026-10-22T09:00:00Z'
  },
  {
    id: 'po-002',
    purchaseRef: 'PO-2026-0042',
    supplierId: 'sup-002',
    supplierName: 'Hindustan Unilever Clearing & Forwarding',
    orderDate: '2026-10-25',
    expectedDate: '2026-10-28',
    receivedDate: undefined,
    items: [
      {
        productId: 'prod-004',
        sku: 'FMCG-TEA-500',
        name: 'Brooke Bond Red Label Strong CTC Tea (500g Box)',
        uom: 'pcs',
        quantityOrdered: 100,
        quantityReceived: 0,
        unitCost: 220.00,
        taxRate: 5,
        taxAmount: 1100.00,
        lineTotal: 23100.00,
        hsnCode: '0902'
      },
      {
        productId: 'prod-009',
        sku: 'FMCG-SURF-BAR',
        name: 'Surf Excel Stain Eraser Detergent Bar (250g x 48 Case)',
        uom: 'box',
        quantityOrdered: 25,
        quantityReceived: 0,
        unitCost: 1180.00,
        taxRate: 18,
        taxAmount: 5310.00,
        lineTotal: 34810.00,
        hsnCode: '3402'
      }
    ],
    subtotal: 51500.00,
    taxTotal: 6410.00,
    grandTotal: 57910.00,
    amountPaid: 0,
    balanceDue: 57910.00,
    status: 'ordered',
    paymentStatus: 'unpaid',
    notes: 'Scheduled for delivery on Thursday via Bhiwandi container',
    createdAt: '2026-10-25T15:00:00Z'
  },
  {
    id: 'po-003',
    purchaseRef: 'PO-2026-0043',
    supplierId: 'sup-003',
    supplierName: 'Nestlé India Regional Distribution Center',
    orderDate: '2026-10-26',
    expectedDate: '2026-10-29',
    receivedDate: undefined,
    items: [
      {
        productId: 'prod-005',
        sku: 'FMCG-MAGGI-BOX',
        name: 'Maggi 2-Minute Masala Instant Noodles (70g x 24 Carton)',
        uom: 'box',
        quantityOrdered: 50,
        quantityReceived: 0,
        unitCost: 290.00,
        taxRate: 12,
        taxAmount: 1740.00,
        lineTotal: 16240.00,
        hsnCode: '1902'
      }
    ],
    subtotal: 14500.00,
    taxTotal: 1740.00,
    grandTotal: 16240.00,
    amountPaid: 0,
    balanceDue: 16240.00,
    status: 'ordered',
    paymentStatus: 'unpaid',
    notes: 'Replenishing festive stock buffer',
    createdAt: '2026-10-26T10:30:00Z'
  }
];

export const INITIAL_STOCK_LOGS: StockMovement[] = [
  {
    id: 'stk-log-01',
    timestamp: '2026-10-25T14:30:00Z',
    productId: 'prod-001',
    productName: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
    sku: 'FMCG-OIL-01',
    type: 'purchase_receipt',
    changeQty: 300,
    previousStock: 88,
    newStock: 388,
    reason: 'Goods received from Adani Wilmar against PO-2026-0041',
    referenceId: 'PO-2026-0041',
    operator: 'Rajesh Sharma (Store)'
  },
  {
    id: 'stk-log-02',
    timestamp: '2026-10-25T16:00:00Z',
    productId: 'prod-001',
    productName: 'Fortune Sunlite Refined Sunflower Oil (1 Litre Pouch)',
    sku: 'FMCG-OIL-01',
    type: 'dispatch',
    changeQty: -48,
    previousStock: 388,
    newStock: 340,
    reason: 'Dispatched to Shree Ganesh Retail Mart for SO-2026-0142',
    referenceId: 'DSP-2026-0089',
    operator: 'Rajesh Sharma (Store)'
  },
  {
    id: 'stk-log-03',
    timestamp: '2026-10-25T16:00:00Z',
    productId: 'prod-002',
    productName: 'Daawat Rozana Gold Basmati Rice (5 kg Bag)',
    sku: 'FMCG-RICE-05',
    type: 'dispatch',
    changeQty: -20,
    previousStock: 145,
    newStock: 125,
    reason: 'Dispatched to Shree Ganesh Retail Mart for SO-2026-0142',
    referenceId: 'DSP-2026-0089',
    operator: 'Rajesh Sharma (Store)'
  },
  {
    id: 'stk-log-04',
    timestamp: '2026-10-25T16:00:00Z',
    productId: 'prod-005',
    productName: 'Maggi 2-Minute Masala Instant Noodles (70g x 24 Carton)',
    sku: 'FMCG-MAGGI-BOX',
    type: 'dispatch',
    changeQty: -12,
    previousStock: 54,
    newStock: 42,
    reason: 'Dispatched to Shree Ganesh Retail Mart for SO-2026-0142',
    referenceId: 'DSP-2026-0089',
    operator: 'Rajesh Sharma (Store)'
  },
  {
    id: 'stk-log-05',
    timestamp: '2026-10-24T18:00:00Z',
    productId: 'prod-007',
    productName: 'Britannia Good Day Butter Cookies (600g Tin Pack)',
    sku: 'FMCG-BRIT-GD',
    type: 'adjustment',
    changeQty: -2,
    previousStock: 16,
    newStock: 14,
    reason: 'Damaged in warehouse handling (crushed outer tins)',
    referenceId: 'ADJ-2026-014',
    operator: 'Rajesh Sharma (Store)'
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-01',
    name: 'Vikramaditya Singhania',
    email: 'vikram@stockflowhub.com',
    phone: '+91 98200 11223',
    role: 'owner',
    active: true,
    department: 'Executive Management'
  },
  {
    id: 'staff-02',
    name: 'Pooja Verma',
    email: 'pooja.sales@stockflowhub.com',
    phone: '+91 98201 22334',
    role: 'sales',
    active: true,
    department: 'Sales & Client Accounts'
  },
  {
    id: 'staff-03',
    name: 'Rajesh Sharma',
    email: 'rajesh.store@stockflowhub.com',
    phone: '+91 98202 33445',
    role: 'store',
    active: true,
    department: 'Warehouse & Logistics'
  },
  {
    id: 'staff-04',
    name: 'Kavita Nair',
    email: 'kavita.accounts@stockflowhub.com',
    phone: '+91 98203 44556',
    role: 'accounts',
    active: true,
    department: 'Billing & Reconciliation'
  }
];

class StorageService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in storage listener', e);
      }
    });
  }

  public ensureInitialized(): void {
    if (typeof window === 'undefined') return;
    const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!initialized) {
      this.resetToDefaults();
    }
  }

  public resetToDefaults(): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(INITIAL_DISPATCHES));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(INITIAL_PURCHASES));
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(INITIAL_STOCK_LOGS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, 'owner');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    this.recalculateCustomerOutstanding();
    this.recalculateSupplierOutstanding();
    this.notify();
  }

  public restoreBackup(data: any): boolean {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file format');
    if (data.products && Array.isArray(data.products)) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    if (data.customers && Array.isArray(data.customers)) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
    if (data.suppliers && Array.isArray(data.suppliers)) localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(data.suppliers));
    if (data.orders && Array.isArray(data.orders)) localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders));
    if (data.dispatches && Array.isArray(data.dispatches)) localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(data.dispatches));
    if (data.invoices && Array.isArray(data.invoices)) localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(data.invoices));
    if (data.payments && Array.isArray(data.payments)) localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(data.payments));
    if (data.purchases && Array.isArray(data.purchases)) localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(data.purchases));
    if (data.stockLogs && Array.isArray(data.stockLogs)) localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(data.stockLogs));
    if (data.settings && typeof data.settings === 'object') localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    if (data.staff && Array.isArray(data.staff)) localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(data.staff));
    this.recalculateCustomerOutstanding();
    this.recalculateSupplierOutstanding();
    this.notify();
    return true;
  }

  // --- Active Role ---
  public getActiveRole(): StaffRole {
    return (localStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE) as StaffRole) || 'owner';
  }

  public setActiveRole(role: StaffRole): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, role);
    this.notify();
  }

  // --- Settings ---
  public getSettings(): BusinessSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  }

  public updateSettings(settings: BusinessSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.notify();
  }

  // --- Products ---
  public getProducts(): Product[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveProduct(product: Partial<Product> & { name: string; sku: string }): Product {
    const products = this.getProducts();
    const now = new Date().toISOString();
    let saved: Product;

    if (product.id) {
      const index = products.findIndex((p) => p.id === product.id);
      if (index >= 0) {
        saved = { ...products[index], ...product, updatedAt: now } as Product;
        products[index] = saved;
      } else {
        saved = { ...product, updatedAt: now, createdAt: now } as Product;
        products.push(saved);
      }
    } else {
      saved = {
        ...product,
        id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        currentStock: product.currentStock ?? 0,
        reservedStock: 0,
        reorderLevel: product.reorderLevel ?? 10,
        wholesaleTiers: product.wholesaleTiers ?? [],
        status: product.status || 'active',
        createdAt: now,
        updatedAt: now
      } as Product;
      products.push(saved);
    }

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.notify();
    return saved;
  }

  public toggleProductStatus(productId: string): void {
    const products = this.getProducts();
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;
    p.status = p.status === 'active' ? 'archived' : 'active';
    p.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.notify();
  }

  public deleteProduct(productId: string): boolean {
    const products = this.getProducts();
    const orders = this.getOrders();
    // Safety check: don't delete if referenced in orders
    const usedInOrders = orders.some((o) => o.items.some((it) => it.productId === productId));
    if (usedInOrders) {
      // Archive instead of hard delete
      this.toggleProductStatus(productId);
      return false;
    }
    const filtered = products.filter((p) => p.id !== productId);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
    this.notify();
    return true;
  }

  public adjustStock(productId: string, newStock: number, reason: string, operator: string): void {
    const products = this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');

    const previousStock = product.currentStock;
    const changeQty = newStock - previousStock;
    product.currentStock = newStock;
    product.updatedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    this.addStockMovement({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'adjustment',
      changeQty,
      previousStock,
      newStock,
      reason,
      referenceId: `ADJ-${Date.now().toString().slice(-4)}`,
      operator
    });

    this.notify();
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveCustomer(cust: Partial<Customer> & { name: string; phone: string }): Customer {
    const customers = this.getCustomers();
    let saved: Customer;
    const now = new Date().toISOString();

    if (cust.id) {
      const idx = customers.findIndex((c) => c.id === cust.id);
      if (idx >= 0) {
        saved = { ...customers[idx], ...cust };
        customers[idx] = saved;
      } else {
        saved = { ...cust, createdAt: now } as Customer;
        customers.push(saved);
      }
    } else {
      saved = {
        ...cust,
        id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: cust.code || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        currentOutstanding: cust.currentOutstanding ?? 0,
        openingBalance: cust.openingBalance ?? 0,
        creditLimit: cust.creditLimit ?? 50000,
        paymentTerms: cust.paymentTerms || 'net_15',
        status: cust.status || 'active',
        createdAt: now
      } as Customer;
      customers.push(saved);
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    this.recalculateCustomerOutstanding();
    this.notify();
    return saved;
  }

  public toggleCustomerStatus(customerId: string): void {
    const customers = this.getCustomers();
    const c = customers.find((cust) => cust.id === customerId);
    if (!c) return;
    c.status = c.status === 'active' ? 'archived' : 'active';
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    this.notify();
  }

  public deleteCustomer(customerId: string): boolean {
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return false;
    if (cust.currentOutstanding > 0) {
      throw new Error(`Cannot delete customer with open balance of ${formatINR(cust.currentOutstanding)}. Please clear dues or archive.`);
    }
    const filtered = customers.filter((c) => c.id !== customerId);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(filtered));
    this.notify();
    return true;
  }

  // --- Suppliers ---
  public getSuppliers(): Supplier[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveSupplier(sup: Partial<Supplier> & { name: string; phone: string }): Supplier {
    const suppliers = this.getSuppliers();
    let saved: Supplier;
    const now = new Date().toISOString();

    if (sup.id) {
      const idx = suppliers.findIndex((s) => s.id === sup.id);
      if (idx >= 0) {
        saved = { ...suppliers[idx], ...sup };
        suppliers[idx] = saved;
      } else {
        saved = { ...sup, createdAt: now } as Supplier;
        suppliers.push(saved);
      }
    } else {
      saved = {
        ...sup,
        id: `sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: sup.code || `SUP-${Math.floor(100 + Math.random() * 900)}`,
        currentOutstanding: sup.currentOutstanding ?? 0,
        openingBalance: sup.openingBalance ?? 0,
        paymentTerms: sup.paymentTerms || 'net_15',
        status: sup.status || 'active',
        createdAt: now
      } as Supplier;
      suppliers.push(saved);
    }

    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    this.recalculateSupplierOutstanding();
    this.notify();
    return saved;
  }

  public toggleSupplierStatus(supplierId: string): void {
    const suppliers = this.getSuppliers();
    const s = suppliers.find((sup) => sup.id === supplierId);
    if (!s) return;
    s.status = s.status === 'active' ? 'archived' : 'active';
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    this.notify();
  }

  public deleteSupplier(supplierId: string): boolean {
    const suppliers = this.getSuppliers();
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) return false;
    if (sup.currentOutstanding > 0) {
      throw new Error(`Cannot delete supplier with open payable balance of ${formatINR(sup.currentOutstanding)}.`);
    }
    const filtered = suppliers.filter((s) => s.id !== supplierId);
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(filtered));
    this.notify();
    return true;
  }

  // --- Sales Orders ---
  public getOrders(): SalesOrder[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveOrder(orderData: Partial<SalesOrder> & { customerId: string; items: OrderItem[] }): SalesOrder {
    const orders = this.getOrders();
    const settings = this.getSettings();
    const products = this.getProducts();
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === orderData.customerId);
    const now = new Date().toISOString();

    let saved: SalesOrder;

    if (orderData.id) {
      const idx = orders.findIndex((o) => o.id === orderData.id);
      const prevOrder = orders[idx];

      // Handle stock reservation transitions
      if (prevOrder && prevOrder.status !== 'confirmed' && orderData.status === 'confirmed') {
        orderData.items.forEach((item) => {
          const p = products.find((prod) => prod.id === item.productId);
          if (p) p.reservedStock = (p.reservedStock || 0) + item.quantity;
        });
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      } else if (prevOrder && prevOrder.status === 'confirmed' && (orderData.status === 'cancelled' || orderData.status === 'draft')) {
        prevOrder.items.forEach((item) => {
          const p = products.find((prod) => prod.id === item.productId);
          if (p) p.reservedStock = Math.max(0, (p.reservedStock || 0) - item.quantity);
        });
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      }

      saved = {
        ...orders[idx],
        ...orderData,
        customerName: customer ? customer.name : orders[idx].customerName,
        customerPhone: customer?.phone || orders[idx].customerPhone,
        customerGstin: customer?.gstin || orders[idx].customerGstin
      } as SalesOrder;
      orders[idx] = saved;
    } else {
      const totalQty = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
      saved = {
        ...orderData,
        id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orderNumber: `${settings.orderPrefix}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: customer ? customer.name : 'Unknown Customer',
        customerPhone: customer?.phone,
        customerGstin: customer?.gstin,
        orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
        expectedDeliveryDate: orderData.expectedDeliveryDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        status: orderData.status || 'draft',
        paymentStatus: 'unpaid',
        dispatchedQty: 0,
        totalQty,
        createdAt: now
      } as SalesOrder;

      if (saved.status === 'confirmed') {
        saved.items.forEach((item) => {
          const p = products.find((prod) => prod.id === item.productId);
          if (p) p.reservedStock = (p.reservedStock || 0) + item.quantity;
        });
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      }

      orders.unshift(saved);
    }

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.notify();
    return saved;
  }

  public deleteOrder(orderId: string): boolean {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    // Release reservation if confirmed
    if (order.status === 'confirmed') {
      const products = this.getProducts();
      order.items.forEach((item) => {
        const p = products.find((prod) => prod.id === item.productId);
        if (p) p.reservedStock = Math.max(0, (p.reservedStock || 0) - item.quantity);
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }

    const filtered = orders.filter((o) => o.id !== orderId);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(filtered));
    this.notify();
    return true;
  }

  // --- Dispatches ---
  public getDispatches(): Dispatch[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DISPATCHES);
    return raw ? JSON.parse(raw) : [];
  }

  public recordDispatch(dispatchData: {
    orderId: string;
    carrierName: string;
    vehicleOrTrackingNo: string;
    itemsToDispatch: { productId: string; quantity: number }[];
    notes?: string;
    operator: string;
  }): Dispatch {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === dispatchData.orderId);
    if (!order) throw new Error('Order not found');

    const products = this.getProducts();
    const settings = this.getSettings();
    const now = new Date().toISOString();

    const dispatchItems = dispatchData.itemsToDispatch.map((it) => {
      const orderItem = order.items.find((oi) => oi.productId === it.productId);
      const product = products.find((p) => p.id === it.productId);
      if (!product) throw new Error(`Product not found: ${it.productId}`);

      const prevStock = product.currentStock;
      product.currentStock = Math.max(0, product.currentStock - it.quantity);
      product.reservedStock = Math.max(0, (product.reservedStock || 0) - it.quantity);
      product.updatedAt = now;

      this.addStockMovement({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'dispatch',
        changeQty: -it.quantity,
        previousStock: prevStock,
        newStock: product.currentStock,
        reason: `Dispatched for order ${order.orderNumber} to ${order.customerName}`,
        referenceId: order.orderNumber,
        operator: dispatchData.operator
      });

      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        uom: product.uom,
        quantityOrdered: orderItem ? orderItem.quantity : it.quantity,
        quantityDispatched: it.quantity
      };
    });

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    const totalDispatchedThisTime = dispatchData.itemsToDispatch.reduce((sum, i) => sum + i.quantity, 0);
    order.dispatchedQty = (order.dispatchedQty || 0) + totalDispatchedThisTime;

    if (order.dispatchedQty >= order.totalQty) {
      order.status = 'dispatched';
    } else {
      order.status = 'partially_dispatched';
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    const dispatchRecord: Dispatch = {
      id: `dsp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dispatchNumber: `${settings.dispatchPrefix}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      shippingAddress: order.notes || 'As per customer profile',
      dispatchDate: new Date().toISOString().split('T')[0],
      carrierName: dispatchData.carrierName,
      vehicleOrTrackingNo: dispatchData.vehicleOrTrackingNo,
      items: dispatchItems,
      status: 'in_transit',
      notes: dispatchData.notes,
      createdAt: now
    };

    const dispatches = this.getDispatches();
    dispatches.unshift(dispatchRecord);
    localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(dispatches));

    this.notify();
    return dispatchRecord;
  }

  public updateDispatchStatus(dispatchId: string, status: 'packed' | 'in_transit' | 'delivered'): void {
    const dispatches = this.getDispatches();
    const d = dispatches.find((dsp) => dsp.id === dispatchId);
    if (!d) return;
    d.status = status;
    localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(dispatches));

    // If delivered, update corresponding order status to delivered if fully dispatched
    if (status === 'delivered') {
      const orders = this.getOrders();
      const order = orders.find((o) => o.id === d.orderId);
      if (order && order.dispatchedQty >= order.totalQty) {
        order.status = 'delivered';
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }
    }

    this.notify();
  }

  // --- Invoices ---
  public getInvoices(): Invoice[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return raw ? JSON.parse(raw) : [];
  }

  public saveInvoice(invoiceData: Partial<Invoice>): Invoice {
    const invoices = this.getInvoices();
    const settings = this.getSettings();
    const now = new Date().toISOString();
    let saved: Invoice;

    if (invoiceData.id) {
      const idx = invoices.findIndex((i) => i.id === invoiceData.id);
      if (idx >= 0) {
        const existing = invoices[idx];
        if (existing.status !== 'draft' && invoiceData.status === 'draft') {
          throw new Error('Issued invoices cannot be reverted to draft.');
        }
        saved = { ...existing, ...invoiceData } as Invoice;
        invoices[idx] = saved;
      } else {
        saved = { ...invoiceData, createdAt: now } as Invoice;
        invoices.push(saved);
      }
    } else {
      saved = {
        ...invoiceData,
        id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        invoiceNumber: invoiceData.invoiceNumber || `${settings.invoicePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
        status: invoiceData.status || 'draft',
        amountPaid: invoiceData.amountPaid || 0,
        balanceDue: (invoiceData.grandTotal || 0) - (invoiceData.amountPaid || 0),
        createdAt: now
      } as Invoice;
      invoices.unshift(saved);
    }

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    this.recalculateCustomerOutstanding();
    this.notify();
    return saved;
  }

  // --- Payments & Collections ---
  public getPayments(): Payment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return raw ? JSON.parse(raw) : [];
  }

  public recordPayment(paymentData: Omit<Payment, 'id' | 'paymentNumber' | 'createdAt'>): Payment {
    const payments = this.getPayments();
    const invoices = this.getInvoices();
    const purchases = this.getPurchases();
    const settings = this.getSettings();
    const now = new Date().toISOString();

    const paymentRecord: Payment = {
      ...paymentData,
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paymentNumber: `${settings.paymentPrefix}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: now
    };

    // Apply allocations to customer invoices
    if (paymentData.partyType === 'customer' && paymentData.allocations.length > 0) {
      paymentData.allocations.forEach((alloc) => {
        const inv = invoices.find((i) => i.id === alloc.invoiceId);
        if (inv) {
          inv.amountPaid = Number(((inv.amountPaid || 0) + alloc.amountAllocated).toFixed(2));
          inv.balanceDue = Number(Math.max(0, inv.grandTotal - inv.amountPaid).toFixed(2));
          if (inv.balanceDue <= 0.01) {
            inv.status = 'paid';
          } else {
            inv.status = 'partially_paid';
          }
        }
      });
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    }

    // Apply payments to supplier purchases if applicable
    if (paymentData.partyType === 'supplier') {
      const supPurchases = purchases.filter((po) => po.supplierId === paymentData.partyId && po.balanceDue > 0);
      let rem = paymentData.amount;
      supPurchases.forEach((po) => {
        if (rem <= 0) return;
        const take = Math.min(rem, po.balanceDue);
        po.amountPaid = Number(((po.amountPaid || 0) + take).toFixed(2));
        po.balanceDue = Number(Math.max(0, po.grandTotal - po.amountPaid).toFixed(2));
        po.paymentStatus = po.balanceDue <= 0.01 ? 'paid' : 'partial';
        rem -= take;
      });
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
    }

    payments.unshift(paymentRecord);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    this.recalculateCustomerOutstanding();
    this.recalculateSupplierOutstanding();
    this.notify();
    return paymentRecord;
  }

  // --- Purchases & Goods Receipt ---
  public getPurchases(): PurchaseOrder[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    return raw ? JSON.parse(raw) : [];
  }

  public savePurchaseOrder(poData: Partial<PurchaseOrder> & { supplierId: string }): PurchaseOrder {
    const purchases = this.getPurchases();
    const settings = this.getSettings();
    const suppliers = this.getSuppliers();
    const supplier = suppliers.find((s) => s.id === poData.supplierId);
    const now = new Date().toISOString();

    let saved: PurchaseOrder;

    if (poData.id) {
      const idx = purchases.findIndex((p) => p.id === poData.id);
      saved = { ...purchases[idx], ...poData } as PurchaseOrder;
      purchases[idx] = saved;
    } else {
      saved = {
        ...poData,
        id: `po-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        purchaseRef: `${settings.purchasePrefix}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierName: supplier?.name || 'Unknown Supplier',
        status: poData.status || 'ordered',
        paymentStatus: 'unpaid',
        amountPaid: 0,
        balanceDue: poData.grandTotal || 0,
        createdAt: now
      } as PurchaseOrder;
      purchases.unshift(saved);
    }

    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
    this.recalculateSupplierOutstanding();
    this.notify();
    return saved;
  }

  public receiveGoods(purchaseId: string, receivedItems: { productId: string; quantityReceived: number }[], operator: string): void {
    const purchases = this.getPurchases();
    const po = purchases.find((p) => p.id === purchaseId);
    if (!po) throw new Error('Purchase order not found');

    const products = this.getProducts();
    const now = new Date().toISOString();

    receivedItems.forEach((ri) => {
      const item = po.items.find((it) => it.productId === ri.productId);
      const product = products.find((prod) => prod.id === ri.productId);
      if (item && product && ri.quantityReceived > 0) {
        item.quantityReceived = (item.quantityReceived || 0) + ri.quantityReceived;

        const prevStock = product.currentStock;
        product.currentStock += ri.quantityReceived;
        product.updatedAt = now;

        this.addStockMovement({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          type: 'purchase_receipt',
          changeQty: ri.quantityReceived,
          previousStock: prevStock,
          newStock: product.currentStock,
          reason: `Goods received against PO ${po.purchaseRef} from ${po.supplierName}`,
          referenceId: po.purchaseRef,
          operator
        });
      }
    });

    const allReceived = po.items.every((it) => (it.quantityReceived || 0) >= it.quantityOrdered);
    po.status = allReceived ? 'received' : 'partially_received';
    po.receivedDate = now.split('T')[0];

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
    this.notify();
  }

  // Supplier return (Return to Vendor)
  public recordSupplierReturn(purchaseId: string, returnedItems: { productId: string; quantity: number }[], reason: string, operator: string): void {
    const purchases = this.getPurchases();
    const po = purchases.find((p) => p.id === purchaseId);
    if (!po) throw new Error('Purchase order not found');

    const products = this.getProducts();
    const now = new Date().toISOString();

    returnedItems.forEach((ri) => {
      const item = po.items.find((it) => it.productId === ri.productId);
      const product = products.find((prod) => prod.id === ri.productId);
      if (item && product && ri.quantity > 0) {
        const prevStock = product.currentStock;
        product.currentStock = Math.max(0, product.currentStock - ri.quantity);
        product.updatedAt = now;

        this.addStockMovement({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          type: 'return',
          changeQty: -ri.quantity,
          previousStock: prevStock,
          newStock: product.currentStock,
          reason: `Returned to Vendor: ${reason} (Ref: ${po.purchaseRef})`,
          referenceId: po.purchaseRef,
          operator
        });
      }
    });

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.notify();
  }

  // --- Stock Movements ---
  public getStockLogs(): StockMovement[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  public addStockMovement(log: Omit<StockMovement, 'id' | 'timestamp'>): void {
    const logs = this.getStockLogs();
    const newLog: StockMovement = {
      ...log,
      id: `stk-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(logs));
  }

  // --- Staff & Permissions ---
  public getStaff(): StaffMember[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STAFF);
    return raw ? JSON.parse(raw) : INITIAL_STAFF;
  }

  public saveStaff(member: Partial<StaffMember> & { name: string; email: string; role: StaffRole }): StaffMember {
    const staff = this.getStaff();
    let saved: StaffMember;
    if (member.id) {
      const idx = staff.findIndex((s) => s.id === member.id);
      saved = { ...staff[idx], ...member };
      staff[idx] = saved;
    } else {
      saved = {
        ...member,
        id: `staff-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        active: member.active ?? true,
        department: member.department || 'Operations'
      } as StaffMember;
      staff.push(saved);
    }
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    this.notify();
    return saved;
  }

  public deleteStaff(staffId: string): void {
    const staff = this.getStaff();
    const filtered = staff.filter((s) => s.id !== staffId);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(filtered));
    this.notify();
  }

  // --- Dynamic Ledger Balances Recalculation ---
  public recalculateCustomerOutstanding(): void {
    const customers = this.getCustomers();
    const invoices = this.getInvoices();

    customers.forEach((cust) => {
      const custInvoices = invoices.filter((i) => i.customerId === cust.id && i.status !== 'cancelled');
      const totalDue = custInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
      cust.currentOutstanding = Number((cust.openingBalance + totalDue).toFixed(2));
    });

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  public recalculateSupplierOutstanding(): void {
    const suppliers = this.getSuppliers();
    const purchases = this.getPurchases();

    suppliers.forEach((sup) => {
      const supPurchases = purchases.filter((po) => po.supplierId === sup.id && po.status !== 'cancelled');
      const totalDue = supPurchases.reduce((sum, po) => sum + (po.balanceDue || 0), 0);
      sup.currentOutstanding = Number((sup.openingBalance + totalDue).toFixed(2));
    });

    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }
}

export const storage = new StorageService();

// Helper calculations
export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function calculateLineItem(item: {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
}): { discountAmount: number; taxableAmount: number; taxAmount: number; lineTotal: number } {
  const base = item.quantity * item.unitPrice;
  const discountAmount = Number(((base * (item.discountPercent || 0)) / 100).toFixed(2));
  const taxableAmount = base - discountAmount;
  const taxAmount = Number(((taxableAmount * (item.taxRate || 0)) / 100).toFixed(2));
  const lineTotal = Number((taxableAmount + taxAmount).toFixed(2));

  return { discountAmount, taxableAmount, taxAmount, lineTotal };
}

export function computeTaxBreakdown(items: OrderItem[], isInterState = false): TaxBreakdown[] {
  const rateMap = new Map<number, number>();

  items.forEach((it) => {
    const prev = rateMap.get(it.taxRate) || 0;
    const taxable = it.quantity * it.unitPrice - it.discountAmount;
    rateMap.set(it.taxRate, prev + taxable);
  });

  const breakdown: TaxBreakdown[] = [];
  rateMap.forEach((taxableAmount, rate) => {
    const totalTax = Number(((taxableAmount * rate) / 100).toFixed(2));
    if (isInterState) {
      breakdown.push({
        rate,
        taxableAmount,
        cgst: 0,
        sgst: 0,
        igst: totalTax
      });
    } else {
      const halfTax = Number((totalTax / 2).toFixed(2));
      breakdown.push({
        rate,
        taxableAmount,
        cgst: halfTax,
        sgst: halfTax,
        igst: 0
      });
    }
  });

  return breakdown;
}
