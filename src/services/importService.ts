/**
 * StockFlow Import & Staging Service
 * 
 * Provides robust spreadsheet parsing, column mapping, schema validation,
 * duplicate detection, and rejected-rows reporting for Products and Commercial Parties.
 * 
 * Security Guardrails:
 * - Formulas starting with '=', '+', '-', '@' are neutralized to prevent formula injection.
 * - Imports never create or alter issued invoices, payments, or stock movements.
 * - Duplicate SKUs and party codes are detected before writing to the database.
 */

import * as XLSX from 'xlsx';
import { productSchema, partySchema } from './validation.ts';
import type { DbProduct, DbParty } from '../types/database.ts';

export type ImportRecordType = 'products' | 'customers' | 'suppliers';
export type ImportType = ImportRecordType;

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

export interface StagedRow<T = any> {
  rowIndex: number;
  rowNumber: number; // 1-based index including headers
  raw: Record<string, any>;
  data: Record<string, any>;
  parsed?: T;
  status: 'valid' | 'invalid';
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

export interface StagedImportResult<T = any> {
  recordType: ImportRecordType;
  type: ImportRecordType;
  totalRows: number;
  validRows: StagedRow<T>[];
  invalidRows: StagedRow<T>[];
  allRows: StagedRow<T>[];
  duplicateCount: number;
  columnMappings: ColumnMapping[];
}

export type ImportValidationResult<T = any> = StagedImportResult<T>;

export interface ImportSummary {
  id: string;
  type: ImportRecordType;
  importedCount: number;
  rejectedCount: number;
  failedCount: number;
  timestamp: string;
  filename: string;
}

export const SUPPORTED_IMPORT_COLUMNS = {
  products: [
    { key: 'sku', label: 'SKU', required: true },
    { key: 'name', label: 'Product Name', required: true },
    { key: 'category', label: 'Category', required: false },
    { key: 'uom', label: 'Unit of Measure', required: false },
    { key: 'purchase_price', label: 'Purchase Cost', required: false },
    { key: 'selling_price', label: 'Selling Price', required: true },
    { key: 'current_stock', label: 'Current Stock', required: false },
    { key: 'min_stock_level', label: 'Reorder Level', required: false },
    { key: 'hsn_code', label: 'HSN Code', required: false },
    { key: 'tax_rate', label: 'GST Rate %', required: false },
  ],
  customers: [
    { key: 'code', label: 'Customer Code', required: false },
    { key: 'name', label: 'Customer Name', required: true },
    { key: 'phone', label: 'Phone', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'contact_person', label: 'Contact Person', required: false },
    { key: 'billing_address', label: 'Billing Address', required: false },
    { key: 'gstin', label: 'GSTIN', required: false },
    { key: 'payment_terms', label: 'Payment Terms', required: false },
    { key: 'credit_limit', label: 'Credit Limit', required: false },
  ],
  suppliers: [
    { key: 'code', label: 'Supplier Code', required: false },
    { key: 'name', label: 'Supplier Name', required: true },
    { key: 'phone', label: 'Phone', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'contact_person', label: 'Contact Person', required: false },
    { key: 'billing_address', label: 'Billing Address', required: false },
    { key: 'gstin', label: 'GSTIN', required: false },
    { key: 'payment_terms', label: 'Payment Terms', required: false },
  ],
};

/**
 * Neutralize dangerous spreadsheet formula injection characters (=, +, -, @)
 */
export function sanitizeCellForSpreadsheet(val: any): any {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  const str = String(val).trim();
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    return `'${str}`;
  }
  return str;
}

export function sanitizeInputString(val: any): any {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return trimmed.replace(/^[\=\+\-\@]+/, '');
  }
  return trimmed;
}

// Field aliases for smart header mapping
const FIELD_ALIASES: Record<ImportRecordType, Record<string, string[]>> = {
  products: {
    sku: ['sku', 'item sku', 'item code', 'product code', 'item_code', 'code', 'barcode'],
    name: ['name', 'product name', 'item name', 'title', 'product_name'],
    category: ['category', 'group', 'product category', 'department'],
    uom: ['uom', 'unit', 'unit of measure', 'unit_of_measure', 'measure'],
    purchase_price: ['purchase price', 'purchase cost', 'cost price', 'cost', 'purchase_cost', 'rate', 'cost_price', 'buying price'],
    selling_price: ['selling price', 'selling rate', 'sales price', 'default_selling_price', 'mrp', 'price', 'default selling price'],
    current_stock: ['current stock', 'available stock', 'stock', 'qty', 'quantity', 'initial stock'],
    min_stock_level: ['reorder level', 'reorder_level', 'min stock', 'minimum stock', 'reorder_qty', 'min_stock_level'],
    hsn_code: ['hsn', 'hsn code', 'hsn_code', 'hsn/sac'],
    tax_rate: ['tax rate', 'gst rate', 'gst', 'gst%', 'tax_rate', 'tax', 'gst_rate']
  },
  customers: {
    code: ['code', 'customer code', 'customer_code', 'client code', 'party code', 'id'],
    name: ['name', 'customer name', 'party name', 'business name', 'store name', 'shop name'],
    phone: ['phone', 'mobile', 'mobile number', 'contact', 'telephone', 'phone number'],
    email: ['email', 'email address', 'mail'],
    contact_person: ['contact person', 'contact_person', 'manager', 'owner name'],
    billing_address: ['address', 'billing address', 'billing_address', 'store address', 'location'],
    gstin: ['gstin', 'gst number', 'gst_in', 'gst_no', 'tax id'],
    payment_terms: ['payment terms', 'payment_terms', 'terms', 'credit days'],
    credit_limit: ['credit limit', 'credit_limit', 'limit', 'max credit']
  },
  suppliers: {
    code: ['code', 'supplier code', 'supplier_code', 'vendor code', 'party code', 'id'],
    name: ['name', 'supplier name', 'party name', 'vendor name', 'company name'],
    phone: ['phone', 'mobile', 'mobile number', 'contact', 'telephone', 'phone number'],
    email: ['email', 'email address', 'mail'],
    contact_person: ['contact person', 'contact_person', 'sales rep', 'manager'],
    billing_address: ['address', 'billing address', 'billing_address', 'depot address'],
    gstin: ['gstin', 'gst number', 'gst_in', 'gst_no', 'tax id'],
    payment_terms: ['payment terms', 'payment_terms', 'terms', 'credit days']
  }
};

/**
 * Suggest auto column mappings based on headers.
 * Supports calling as autoMapColumns(recordType, headers) or autoMapColumns(headers, recordType).
 */
export function autoMapColumns(
  arg1: ImportRecordType | string[],
  arg2: ImportRecordType | string[]
): Record<string, string> {
  const type: ImportRecordType = typeof arg1 === 'string' ? (arg1 as ImportRecordType) : (arg2 as ImportRecordType);
  const headers: string[] = Array.isArray(arg1) ? arg1 : (arg2 as string[]);

  const aliases = FIELD_ALIASES[type] || FIELD_ALIASES.products;
  const mapping: Record<string, string> = {};

  headers.forEach((header) => {
    const normalized = header.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
    for (const [field, aliasList] of Object.entries(aliases)) {
      if (aliasList.some((alias) => alias.toLowerCase() === normalized)) {
        mapping[header] = field;
        break;
      }
    }
  });

  return mapping;
}

/**
 * 1. Parse uploaded XLSX or CSV file buffer into raw JSON rows
 */
export async function parseSpreadsheetFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rawJson || rawJson.length === 0) {
          throw new Error('Spreadsheet file is completely empty.');
        }

        let headerRowIndex = 0;
        while (headerRowIndex < rawJson.length && rawJson[headerRowIndex].every((c) => !c)) {
          headerRowIndex++;
        }

        if (headerRowIndex >= rawJson.length) {
          throw new Error('No column headers detected in spreadsheet.');
        }

        const headers = rawJson[headerRowIndex].map((h: any) => String(h).trim()).filter(Boolean);
        const dataRows = rawJson.slice(headerRowIndex + 1);

        const rows: Record<string, any>[] = [];
        dataRows.forEach((rowArray) => {
          if (rowArray.every((val: any) => val === '' || val === null || val === undefined)) {
            return;
          }

          const rowObj: Record<string, any> = {};
          headers.forEach((header, colIdx) => {
            rowObj[header] = sanitizeInputString(rowArray[colIdx]);
          });
          rows.push(rowObj);
        });

        resolve({ headers, rows });
      } catch (err) {
        reject(new Error(`Failed to parse spreadsheet file: ${(err as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read spreadsheet file.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 2. Validate and Stage spreadsheet data before database commit.
 * Accepts both options object or positional arguments.
 */
export async function validateAndStageImport(
  arg1:
    | {
        businessId: string;
        recordType: ImportRecordType;
        rawRows: Record<string, any>[];
        columnMapping: Record<string, string>;
      }
    | string,
  arg2?: ImportRecordType,
  arg3?: Record<string, any>[],
  arg4?: ColumnMapping[] | Record<string, string>
): Promise<StagedImportResult> {
  let businessId: string;
  let type: ImportRecordType;
  let rawRows: Record<string, any>[];
  let mappingRecord: Record<string, string> = {};

  if (typeof arg1 === 'object') {
    businessId = arg1.businessId;
    type = arg1.recordType;
    rawRows = arg1.rawRows;
    mappingRecord = arg1.columnMapping;
  } else {
    businessId = arg1;
    type = arg2!;
    rawRows = arg3!;
    if (Array.isArray(arg4)) {
      arg4.forEach((m) => {
        mappingRecord[m.sourceColumn] = m.targetField;
      });
    } else if (arg4) {
      mappingRecord = arg4;
    }
  }

  // Reverse mapping: targetField -> sourceColumn
  const targetToSource = new Map<string, string>();
  for (const [source, target] of Object.entries(mappingRecord)) {
    if (target) {
      targetToSource.set(target, source);
    }
  }

  // Fetch existing records for duplicate detection via dynamic API import
  const { api } = await import('./api.ts');
  const existingProducts: DbProduct[] = type === 'products' ? await api.getProducts(businessId) : [];
  const existingParties: DbParty[] = type !== 'products' ? await api.getParties(businessId) : [];

  const existingProductSkus = new Set(existingProducts.map((p) => (p.sku || '').toUpperCase()));
  const existingPartyCodes = new Set(existingParties.map((p) => (p.code || '').toUpperCase()));
  const existingPartyPhones = new Set(existingParties.map((p) => (p.phone || '').replace(/\D/g, '')));

  const batchSkus = new Set<string>();
  const batchPartyCodes = new Set<string>();

  const allRows: StagedRow[] = [];
  const validRows: StagedRow[] = [];
  const invalidRows: StagedRow[] = [];
  let duplicateCount = 0;

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];
    const warnings: string[] = [];
    let isDuplicate = false;
    let mappedEntity: any = {};

    if (type === 'products') {
      const sku = String(raw[targetToSource.get('sku') || ''] || '').trim().toUpperCase();
      const name = String(raw[targetToSource.get('name') || ''] || '').trim();
      const category = String(raw[targetToSource.get('category') || ''] || 'General').trim();
      const uom = String(raw[targetToSource.get('uom') || targetToSource.get('unit') || ''] || 'pcs').trim().toLowerCase();
      const purchaseCost = Number(raw[targetToSource.get('purchase_price') || targetToSource.get('purchase_cost') || ''] || 0);
      const sellingPrice = Number(raw[targetToSource.get('selling_price') || targetToSource.get('default_selling_price') || ''] || 0);
      const currentStock = Number(raw[targetToSource.get('current_stock') || ''] || 0);
      const reorderLevel = Number(raw[targetToSource.get('min_stock_level') || targetToSource.get('reorder_level') || ''] || 10);
      const hsnCode = String(raw[targetToSource.get('hsn_code') || ''] || '').trim();
      const gstRate = Number(raw[targetToSource.get('tax_rate') || targetToSource.get('gst_rate') || ''] ?? 5);

      mappedEntity = {
        sku,
        name,
        category,
        uom: ['pcs', 'box', 'crate', 'kg', 'ltr', 'bag', 'carton'].includes(uom) ? uom : 'pcs',
        purchase_cost: purchaseCost,
        default_selling_price: sellingPrice,
        reorder_level: reorderLevel,
        hsn_code: hsnCode,
        gst_rate: gstRate,
        wholesale_tiers: [],
        status: 'active',
        current_stock: currentStock,
      };

      if (!sku) {
        errors.push('SKU is required');
      } else if (existingProductSkus.has(sku)) {
        errors.push(`Duplicate SKU "${sku}": already exists in catalog.`);
        isDuplicate = true;
        duplicateCount++;
      } else if (batchSkus.has(sku)) {
        errors.push(`Duplicate SKU "${sku}": repeated in this spreadsheet.`);
        isDuplicate = true;
        duplicateCount++;
      } else {
        batchSkus.add(sku);
      }

      if (!name) {
        errors.push('Product name is required');
      }
      if (sellingPrice <= 0) {
        errors.push('Selling price must be greater than zero');
      }

      const parseResult = productSchema.safeParse(mappedEntity);
      if (!parseResult.success) {
        parseResult.error.issues.forEach((err) => {
          const msg = `${err.path.join('.')}: ${err.message}`;
          if (!errors.includes(msg)) errors.push(msg);
        });
      }
    } else {
      const code = String(raw[targetToSource.get('code') || ''] || '').trim().toUpperCase();
      const name = String(raw[targetToSource.get('name') || ''] || '').trim();
      const phone = String(raw[targetToSource.get('phone') || ''] || '').replace(/\s+/g, '');
      const email = String(raw[targetToSource.get('email') || ''] || '').trim();
      const contactPerson = String(raw[targetToSource.get('contact_person') || ''] || '').trim();
      const billingAddress = String(raw[targetToSource.get('billing_address') || targetToSource.get('address') || ''] || '').trim();
      const gstin = String(raw[targetToSource.get('gstin') || ''] || '').trim().toUpperCase();
      const paymentTerms = String(raw[targetToSource.get('payment_terms') || ''] || 'net_15').trim().toLowerCase();
      const creditLimit = Number(raw[targetToSource.get('credit_limit') || ''] || 0);

      mappedEntity = {
        code,
        name,
        party_type: type === 'customers' ? 'customer' : 'supplier',
        contact_person: contactPerson,
        phone,
        email: email || undefined,
        billing_address: billingAddress,
        gstin: gstin || undefined,
        payment_terms: ['immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60'].includes(paymentTerms) ? paymentTerms : 'net_15',
        credit_limit: creditLimit,
        opening_balance: 0,
        status: 'active',
      };

      if (!name) {
        errors.push('Party name is required');
      }
      if (!phone) {
        errors.push('Phone number is required');
      }

      if (code) {
        if (existingPartyCodes.has(code)) {
          errors.push(`Duplicate Code "${code}": already exists in records.`);
          isDuplicate = true;
          duplicateCount++;
        } else if (batchPartyCodes.has(code)) {
          errors.push(`Duplicate Code "${code}": repeated in this spreadsheet.`);
          isDuplicate = true;
          duplicateCount++;
        } else {
          batchPartyCodes.add(code);
        }
      }

      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone && cleanPhone.length === 10 && existingPartyPhones.has(cleanPhone)) {
        warnings.push(`Phone number ${phone} matches an existing partner.`);
      }

      const parseResult = partySchema.safeParse(mappedEntity);
      if (!parseResult.success) {
        parseResult.error.issues.forEach((err) => {
          const msg = `${err.path.join('.')}: ${err.message}`;
          if (!errors.includes(msg)) errors.push(msg);
        });
      }
    }

    const staged: StagedRow = {
      rowIndex: rowNumber,
      rowNumber,
      raw,
      data: mappedEntity,
      parsed: mappedEntity,
      status: errors.length === 0 ? 'valid' : 'invalid',
      isValid: errors.length === 0,
      errors,
      warnings,
      isDuplicate,
    };

    allRows.push(staged);
    if (staged.isValid) {
      validRows.push(staged);
    } else {
      invalidRows.push(staged);
    }
  });

  const columnMappings: ColumnMapping[] = Object.entries(mappingRecord).map(([sourceColumn, targetField]) => ({
    sourceColumn,
    targetField,
  }));

  return {
    recordType: type,
    type,
    totalRows: rawRows.length,
    validRows,
    invalidRows,
    allRows,
    duplicateCount,
    columnMappings,
  };
}

/**
 * 3. Generate Rejected-Rows Spreadsheet Report for user correction
 */
export function downloadRejectedRowsReport(arg1: any, arg2?: any) {
  const invalidRows: StagedRow[] = Array.isArray(arg1) ? arg1 : arg2;
  const typeOrPrefix = typeof arg1 === 'string' ? arg1 : 'StockFlow_Rejected_Rows';

  if (!invalidRows || invalidRows.length === 0) return;

  const firstRaw = invalidRows[0].raw;
  const originalHeaders = Object.keys(firstRaw);
  const reportHeaders = ['Excel Row #', ...originalHeaders, 'Rejection Reasons'];

  const rows = invalidRows.map((item) => [
    item.rowNumber || item.rowIndex,
    ...originalHeaders.map((h) => item.raw[h] ?? ''),
    item.errors.join('; '),
  ]);

  const worksheetData = [reportHeaders, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rejected Rows');

  XLSX.writeFile(wb, `${typeOrPrefix}_rejected_rows_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * 4. Generate Sample Template Rows for Testing and UI Preview
 */
export function generateSampleTemplateRows(type: ImportRecordType): Record<string, any>[] {
  if (type === 'products') {
    return [
      {
        sku: 'FMCG-RICE-25K',
        name: 'Daawat Rozana Super Basmati Rice (25kg Bag)',
        category: 'Grains & Pulses',
        uom: 'bag',
        purchase_price: 1850.0,
        selling_price: 2350.0,
        current_stock: 40,
        min_stock_level: 10,
        hsn_code: '1006',
        tax_rate: 5,
      },
      {
        sku: 'FMCG-OIL-15L',
        name: 'Fortune Sunlite Refined Sunflower Oil (15L Tin)',
        category: 'Edible Oils',
        uom: 'tin',
        purchase_price: 1950.0,
        selling_price: 2280.0,
        current_stock: 25,
        min_stock_level: 8,
        hsn_code: '1512',
        tax_rate: 5,
      },
    ];
  }
  if (type === 'customers') {
    return [
      {
        code: 'CUST-1001',
        name: 'Ganesh Provision & Supermarket',
        phone: '9820011223',
        email: 'ganesh.provision@gmail.com',
        contact_person: 'Suresh Patel',
        billing_address: 'Shop 4, Station Road, Thane West 400601',
        gstin: '27AABCG1234F1Z5',
        payment_terms: 'net_15',
        credit_limit: 75000,
      },
    ];
  }
  return [
    {
      code: 'SUP-201',
      name: 'Adani Wilmar Depot Navi Mumbai',
      phone: '9833012345',
      email: 'vashi.depot@adaniwilmar.in',
      contact_person: 'Manish Joshi',
      billing_address: 'Plot 12, TTC Industrial Area, MIDC, Mahape 400710',
      gstin: '27AAACA1289H1Z2',
      payment_terms: 'net_30',
    },
  ];
}

/**
 * 5. Download Starter Template (CSV or XLSX)
 */
export function downloadSampleTemplate(type: ImportRecordType, format: 'xlsx' | 'csv' = 'xlsx') {
  const sampleRows = generateSampleTemplateRows(type);
  const headers = Object.keys(sampleRows[0]);
  const data = sampleRows.map((r) => headers.map((h) => r[h]));

  const worksheetData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  const filename = `StockFlow_${type}_import_template.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, filename, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, filename, { bookType: 'xlsx' });
  }
}

/**
 * 6. Commit Validated Staged Rows to Database
 */
export async function commitImportedRows(
  businessId: string,
  type: ImportRecordType,
  validRows: StagedRow[]
): Promise<ImportSummary> {
  const { api } = await import('./api.ts');
  let importedCount = 0;
  let failedCount = 0;

  for (const row of validRows) {
    if (!row.parsed) continue;

    try {
      if (type === 'products') {
        await api.createProduct(businessId, row.parsed as any);
        importedCount++;
      } else {
        await api.createParty(businessId, row.parsed as any);
        importedCount++;
      }
    } catch (err) {
      failedCount++;
    }
  }

  return {
    id: `imp-${Date.now()}`,
    type,
    importedCount,
    rejectedCount: 0,
    failedCount,
    timestamp: new Date().toISOString(),
    filename: `Import_${type}`,
  };
}
