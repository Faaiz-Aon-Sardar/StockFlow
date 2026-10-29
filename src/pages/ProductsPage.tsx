import React, { useState } from 'react';
import {
  Search,
  Plus,
  History,
  AlertTriangle,
  Edit2,
  Package,
  ArrowRightLeft,
  Archive,
  RotateCcw,
  Trash2,
  CheckCircle,
  Tag
} from 'lucide-react';
import { Product, UnitOfMeasure, StockMovement, WholesaleTier } from '../types';
import { storage, formatINR } from '../services/storage';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(storage.getProducts());
  const [stockLogs, setStockLogs] = useState<StockMovement[]>(storage.getStockLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'normal'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockInput, setNewStockInput] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical stock audit discrepancy');
  const [adjustOperator, setAdjustOperator] = useState<string>('Store Manager');

  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [selectedProductForAudit, setSelectedProductForAudit] = useState<Product | null>(null);

  // Form state for add/edit product
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Edible Oils');
  const [description, setDescription] = useState('');
  const [uom, setUom] = useState<UnitOfMeasure>('pcs');
  const [purchaseCost, setPurchaseCost] = useState<number>(100);
  const [defaultSellingPrice, setDefaultSellingPrice] = useState<number>(120);
  const [currentStock, setCurrentStock] = useState<number>(50);
  const [reorderLevel, setReorderLevel] = useState<number>(20);
  const [hsnCode, setHsnCode] = useState('1512');
  const [gstRate, setGstRate] = useState<number>(5);
  const [tiers, setTiers] = useState<WholesaleTier[]>([{ minQty: 24, unitPrice: 115 }]);

  const categories = [
    'all',
    'Edible Oils',
    'Grains & Pulses',
    'Staples',
    'Beverages',
    'Packaged Foods',
    'Confectionery & Biscuits',
    'Personal & Home Care',
    'Dairy & Ghee'
  ];

  const reloadData = () => {
    setProducts(storage.getProducts());
    setStockLogs(storage.getStockLogs());
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setSku(`FMCG-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategory('Packaged Foods');
    setDescription('');
    setUom('box');
    setPurchaseCost(100);
    setDefaultSellingPrice(125);
    setCurrentStock(50);
    setReorderLevel(15);
    setHsnCode('1902');
    setGstRate(12);
    setTiers([{ minQty: 20, unitPrice: 120 }]);
    setShowProductModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setDescription(p.description);
    setUom(p.uom);
    setPurchaseCost(p.purchaseCost);
    setDefaultSellingPrice(p.defaultSellingPrice);
    setCurrentStock(p.currentStock);
    setReorderLevel(p.reorderLevel);
    setHsnCode(p.hsnCode);
    setGstRate(p.gstRate);
    setTiers(p.wholesaleTiers && p.wholesaleTiers.length > 0 ? [...p.wholesaleTiers] : [{ minQty: 20, unitPrice: p.defaultSellingPrice * 0.95 }]);
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;

    const validTiers = tiers.filter((t) => t.minQty > 0 && t.unitPrice > 0);

    storage.saveProduct({
      id: editingProduct ? editingProduct.id : undefined,
      sku,
      name,
      category,
      description,
      uom,
      purchaseCost: Number(purchaseCost),
      defaultSellingPrice: Number(defaultSellingPrice),
      wholesaleTiers: validTiers,
      currentStock: Number(currentStock),
      reorderLevel: Number(reorderLevel),
      hsnCode,
      gstRate: Number(gstRate)
    });

    reloadData();
    setShowProductModal(false);
  };

  const handleToggleArchive = (productId: string) => {
    storage.toggleProductStatus(productId);
    reloadData();
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product? If it has historical order records, it will be safely archived instead.')) {
      storage.deleteProduct(productId);
      reloadData();
    }
  };

  const handleOpenAdjust = (p: Product) => {
    setAdjustingProduct(p);
    setNewStockInput(p.currentStock);
    setAdjustReason('Physical stock audit discrepancy');
    setAdjustOperator('Store Manager');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    storage.adjustStock(adjustingProduct.id, Number(newStockInput), adjustReason, adjustOperator);
    reloadData();
    setShowAdjustModal(false);
  };

  const handleOpenAudit = (p: Product) => {
    setSelectedProductForAudit(p);
    setShowAuditLogs(true);
  };

  const handleAddTierRow = () => {
    const lastTier = tiers[tiers.length - 1];
    setTiers([
      ...tiers,
      { minQty: (lastTier?.minQty || 20) + 30, unitPrice: (lastTier?.unitPrice || defaultSellingPrice) * 0.95 }
    ]);
  };

  const handleRemoveTierRow = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.hsnCode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && p.currentStock <= p.reorderLevel) ||
      (stockFilter === 'normal' && p.currentStock > p.reorderLevel);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStock && matchesStatus;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Top Filter & Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU, product name, or HSN code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* Category, Stock, and Status filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-slate-400 shrink-0 font-medium">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-medium">Stock:</span>
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2 py-0.5 rounded text-xs ${
                  stockFilter === 'all' ? 'bg-blue-100 text-blue-800 font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-2 py-0.5 rounded text-xs ${
                  stockFilter === 'low' ? 'bg-rose-100 text-rose-800 font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Low Stock
              </button>
            </div>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
              <span className="text-slate-400 font-medium">Status:</span>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2 py-0.5 rounded text-xs ${
                  statusFilter === 'active' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('archived')}
                className={`px-2 py-0.5 rounded text-xs ${
                  statusFilter === 'archived' ? 'bg-amber-100 text-amber-900 font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Archived
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded text-xs ${
                  statusFilter === 'all' ? 'bg-slate-200 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description="No items match your search or category filter. Try clearing filters or add a new wholesale SKU."
            actionLabel="Add New Product"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Product Name & Category</th>
                  <th className="py-2.5 px-3">HSN / GST</th>
                  <th className="py-2.5 px-3 text-right">Cost Price</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Stock (Physical)</th>
                  <th className="py-2.5 px-3 text-right">Reserved</th>
                  <th className="py-2.5 px-3 text-right">Available</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const available = Math.max(0, p.currentStock - (p.reservedStock || 0));
                  const isLow = p.currentStock <= p.reorderLevel;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {p.sku}
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px]">
                        <p className="font-semibold text-slate-900 truncate" title={p.name}>
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {p.category} · UOM: <span className="font-medium uppercase">{p.uom}</span>
                        </p>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-700">{p.hsnCode}</span>
                        <span className="text-[11px] text-slate-500 block">GST: {p.gstRate}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatINR(p.purchaseCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatINR(p.defaultSellingPrice)}
                        {p.wholesaleTiers?.length > 0 && (
                          <span className="text-[10px] text-blue-600 block" title={`Wholesale tier: ${p.wholesaleTiers[0].minQty}+ @ ${formatINR(p.wholesaleTiers[0].unitPrice)}`}>
                            Tier 1: {formatINR(p.wholesaleTiers[0].unitPrice)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            isLow ? 'text-rose-700' : 'text-slate-900'
                          }`}
                        >
                          {p.currentStock} {p.uom}
                        </span>
                        {isLow && (
                          <span className="text-[10px] text-rose-600 flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3" /> Min: {p.reorderLevel}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                        {p.reservedStock || 0} {p.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {available} {p.uom}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            p.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            title="Adjust physical stock with audit reason"
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenAudit(p)}
                            title="View stock movement logs"
                            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit product catalog details"
                            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleArchive(p.id)}
                            title={p.status === 'active' ? 'Archive product' : 'Restore product'}
                            className={`p-1 rounded ${
                              p.status === 'active'
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-amber-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {p.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            title="Delete or Archive Product"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Add / Edit Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={editingProduct ? 'Edit Wholesale Product' : 'Add New Wholesale Product'}
        subtitle="Catalog changes will not alter historical invoices already issued"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">SKU / Code *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              >
                {categories.filter((c) => c !== 'all').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-medium text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fortune Refined Sunflower Oil (1 Litre Pouch)"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="text-xs">
            <label className="block font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Unit of Measure</label>
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value as UnitOfMeasure)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="box">Box (box)</option>
                <option value="crate">Crate (crate)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="ltr">Litre (ltr)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GST Rate %</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Reorder Level</label>
              <input
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Purchase Cost (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Default Selling Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={defaultSellingPrice}
                onChange={(e) => setDefaultSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
              />
            </div>
            {!editingProduct && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Physical Stock</label>
                <input
                  type="number"
                  min={0}
                  value={currentStock}
                  onChange={(e) => setCurrentStock(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono"
                />
              </div>
            )}
          </div>

          {/* Wholesale Bulk Pricing Tiers */}
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" /> Wholesale Bulk Pricing Tiers
              </span>
              <button
                type="button"
                onClick={handleAddTierRow}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
              >
                + Add Tier
              </button>
            </div>

            {tiers.length === 0 ? (
              <p className="text-[11px] text-slate-400">No wholesale tiers configured. Standard selling price will apply to all quantities.</p>
            ) : (
              <div className="space-y-2">
                {tiers.map((t, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-500 mb-0.5">Min Qty ({uom})</label>
                      <input
                        type="number"
                        min={1}
                        value={t.minQty}
                        onChange={(e) => {
                          const newTiers = [...tiers];
                          newTiers[index].minQty = Number(e.target.value);
                          setTiers(newTiers);
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-500 mb-0.5">Wholesale Unit Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        value={t.unitPrice}
                        onChange={(e) => {
                          const newTiers = [...tiers];
                          newTiers[index].unitPrice = Number(e.target.value);
                          setTiers(newTiers);
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTierRow(index)}
                      className="text-slate-400 hover:text-rose-600 pt-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowProductModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Physical Stock Adjustment"
        subtitle={`Adjust inventory for: ${adjustingProduct?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Current System Stock:</span>
              <span className="font-mono font-bold text-slate-900">
                {adjustingProduct?.currentStock} {adjustingProduct?.uom}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Reserved for Orders:</span>
              <span className="font-mono text-amber-700">
                {adjustingProduct?.reservedStock || 0} {adjustingProduct?.uom}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              New Physical Count ({adjustingProduct?.uom}) *
            </label>
            <input
              type="number"
              min={0}
              required
              value={newStockInput}
              onChange={(e) => setNewStockInput(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md font-mono text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Variance:{' '}
              <span
                className={`font-mono font-semibold ${
                  newStockInput - (adjustingProduct?.currentStock || 0) < 0
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              >
                {newStockInput - (adjustingProduct?.currentStock || 0) >= 0 ? '+' : ''}
                {newStockInput - (adjustingProduct?.currentStock || 0)} {adjustingProduct?.uom}
              </span>
            </p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reason for Adjustment *</label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
            >
              <option value="Physical stock audit discrepancy">Physical stock audit discrepancy</option>
              <option value="Damaged / broken / expired in warehouse">Damaged / broken / expired in warehouse</option>
              <option value="Return to vendor replacement">Return to vendor replacement</option>
              <option value="Data entry correction">Data entry correction</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Operator / Approver *</label>
            <input
              type="text"
              required
              value={adjustOperator}
              onChange={(e) => setAdjustOperator(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Movement Audit Log Modal */}
      <Modal
        isOpen={showAuditLogs}
        onClose={() => setShowAuditLogs(false)}
        title="Stock Movement Ledger"
        subtitle={`Audit history for ${selectedProductForAudit?.name} (${selectedProductForAudit?.sku})`}
        maxWidth="3xl"
      >
        <div className="space-y-3">
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Date & Time</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Reference</th>
                  <th className="py-2 px-3 text-right">Change</th>
                  <th className="py-2 px-3 text-right">Balance</th>
                  <th className="py-2 px-3">Reason / Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockLogs
                  .filter((log) => !selectedProductForAudit || log.productId === selectedProductForAudit.id)
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 px-3">
                        <span className="capitalize px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {log.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-blue-700">{log.referenceId || '—'}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                        <span className={log.changeQty > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {log.changeQty > 0 ? `+${log.changeQty}` : log.changeQty}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900 font-medium">
                        {log.newStock}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        <p>{log.reason}</p>
                        <p className="text-[10px] text-slate-400">By {log.operator}</p>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowAuditLogs(false)}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
            >
              Close Ledger
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
