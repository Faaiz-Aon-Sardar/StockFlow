# StockFlow — Wholesale & Distribution Business Management System

StockFlow is a responsive, high-performance wholesale and distribution management dashboard designed for distributors, trading agencies, and warehouse businesses transitioning from paper registers and Excel spreadsheets to a centralized system.

---

## 1. Getting Started & Scripts

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Starts the Vite development server on port 3000 (`http://localhost:3000`).

### Build for Production
```bash
npm run build
```
Creates an optimized production bundle in the `dist` folder.

### Type Check & Validation
```bash
npm run lint
```
Runs the TypeScript compiler with `--noEmit` to verify type safety across the entire application.

---

## 2. Implemented Features & Architecture

StockFlow implements all 12 core business management modules:

1. **Dashboard (`src/pages/Dashboard.tsx`)**:
   - Real-time KPIs: Today's sales, month's sales, cash collections, total customer receivables, supplier payables, FIFO stock valuation, low stock warning count, and orders awaiting dispatch.
   - Monthly trend comparison with Recharts distinguishing Invoiced Sales, Cash Collected, and COGS-deducted Gross Profit.
   - Live overdue invoices panel and top stock holdings.

2. **Products & Inventory (`src/pages/ProductsPage.tsx`)**:
   - Product catalog with SKU, HSN codes, GST slabs, UOM (`pcs`, `box`, `crate`, `kg`, `ltr`), wholesale pricing tiers, and reorder alerts.
   - Physical stock adjustment modal requiring an audit reason (audit discrepancy, damage/expiry, vendor return) and operator signature.
   - Product-specific stock ledger modal tracking every addition and reduction.

3. **Customer Directory (`src/pages/CustomersPage.tsx`)**:
   - Master records with GSTIN, billing/shipping addresses, payment terms (`Net 7`, `Net 15`, `Net 30`, `Immediate`), and credit limits.
   - Interactive split drawer with order history, invoice register, payment receipts, and outstanding dues.

4. **Supplier Directory (`src/pages/SuppliersPage.tsx`)**:
   - Vendor master records for FMCG manufacturer depots and C&F agencies.
   - Tracks purchase order history, supplier disbursements, and accounts payable.

5. **Sales Orders (`src/pages/SalesOrdersPage.tsx`)**:
   - Multi-item order builder with auto-computed line discounts, GST taxes, and totals.
   - Explicit stock reservation: Confirmed orders reserve stock without deducting physical inventory until dispatch.
   - Direct action to generate GST Tax Invoices.

6. **Purchases & Goods Receipt (`src/pages/PurchasesPage.tsx`)**:
   - Vendor purchase order builder.
   - Physical Goods Receipt workflow that verifies delivered quantities and directly increments warehouse stock.

7. **Dispatches (`src/pages/DispatchesPage.tsx`)**:
   - Dedicated fulfillment queue of confirmed orders awaiting packing.
   - Record dispatch modal capturing transport carrier, vehicle registration number, and packing quantities.
   - Permanently deducts physical inventory, releases reservations, and generates a printable Delivery Challan / Manifest.

8. **Invoices (`src/pages/InvoicesPage.tsx`)**:
   - Form GST INV-1 standard compliant Tax Invoice generator.
   - Full-screen, printable A4 invoice template with intra-state CGST/SGST tax breakdown, bank remittance details, and UPI QR payment info.
   - Strict immutability: Issued invoices are locked against silent editing.

9. **Payments & Collections (`src/pages/PaymentsPage.tsx`)**:
   - Bank Transfer, UPI, Cash, and Cheque payment entry.
   - Multi-invoice payment allocation engine with automated oldest-first allocation and anti-overallocation guardrails.

10. **Reports & Excel (`src/pages/ReportsPage.tsx`)**:
    - Real-time reporting across sales ledgers, product-wise revenue, customer receivables aging, FIFO inventory valuation, and stock movement logs.
    - Export reports to CSV.
    - Spreadsheet CSV import previewer with pre-commit validation highlighting errors (missing SKU, negative pricing, invalid GSTIN) before committing data.

11. **Staff & Permissions (`src/pages/StaffPage.tsx`)**:
    - Role-based access control matrix covering Owner (Admin), Sales Staff, Store Staff, and Accounts Staff.
    - Live role perspective switcher in the header to preview user experiences under different permission gates.
    - Documented mapping to Supabase Auth and PostgreSQL Row Level Security (RLS).

12. **Business Settings (`src/pages/SettingsPage.tsx`)**:
    - Company legal profile, GSTIN, PAN, state code, and warehouse address.
    - Bank remittance account numbers, IFSC codes, and UPI VPA.
    - Numbering prefixes and FIFO / Weighted Average inventory valuation method selection.
    - Full JSON workspace export and one-click demo data reset.

---

## 3. Data Access Layer & Supabase Migration Path

All entities and state mutations reside in `src/services/storage.ts`:
- **Prototype Mode**: Employs browser `localStorage` seeded with realistic Indian FMCG wholesale products (Fortune sunflower oil, Daawat Basmati rice, Tata Salt, Maggi noodles, Surf Excel, Britannia Good Day, etc.), Kirana retail stores, and manufacturer depots.
- **Supabase Integration**: The service methods (`getProducts`, `saveOrder`, `recordDispatch`, `recordPayment`, etc.) use clean typed parameters that map 1:1 to Supabase PostgreSQL table schemas (`products`, `customers`, `sales_orders`, `order_items`, `invoices`, `payments`, `dispatches`).

---

## 4. Known Prototype Limitations

- **Browser-Local Storage**: Prototype data is held in browser `localStorage`. Multi-user concurrent updates across separate physical devices require connecting Supabase or a relational backend.
- **Client-Side Auth Gating**: Role switching in this prototype simulates UI permissions for demonstration and UX testing; production deployment requires Supabase Auth JWT validation and PostgreSQL Row Level Security (RLS).
