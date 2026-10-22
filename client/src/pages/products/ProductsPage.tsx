import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
  Edit2,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: 'GENERAL',
    unitPrice: 0,
    costPrice: 0,
    currency: 'USD',
    taxRate: 0,
    unit: 'UNIT',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

      const res = await apiClient.get(`/products?${params.toString()}`);
      if (res.success) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleOpenModal = (prod: any = null) => {
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        name: prod.name,
        sku: prod.sku,
        description: prod.description || '',
        category: prod.category || 'GENERAL',
        unitPrice: prod.unitPrice,
        costPrice: prod.costPrice || 0,
        currency: prod.currency || 'USD',
        taxRate: prod.taxRate || 0,
        unit: prod.unit || 'UNIT',
        isActive: prod.isActive,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        description: '',
        category: 'GENERAL',
        unitPrice: 0,
        costPrice: 0,
        currency: 'USD',
        taxRate: 0,
        unit: 'UNIT',
        isActive: true,
      });
    }
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      setFormError('Product Name and SKU are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingProduct) {
        const res = await apiClient.patch(`/products/${editingProduct.id}`, {
          ...formData,
          unitPrice: Number(formData.unitPrice),
          costPrice: Number(formData.costPrice),
          taxRate: Number(formData.taxRate),
        });
        if (res.success) {
          setIsModalOpen(false);
          fetchProducts();
        } else {
          setFormError(res.error || 'Failed to update product');
        }
      } else {
        const res = await apiClient.post('/products', {
          ...formData,
          unitPrice: Number(formData.unitPrice),
          costPrice: Number(formData.costPrice),
          taxRate: Number(formData.taxRate),
        });
        if (res.success) {
          setIsModalOpen(false);
          fetchProducts();
        } else {
          setFormError(res.error || 'Failed to create product');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove or deactivate "${name}"?`)) return;
    try {
      const res = await apiClient.delete(`/products/${id}`);
      if (res.success) {
        fetchProducts();
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">Product & Service Catalog</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              CPQ PRICING
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Maintain standard SKUs, tiered pricing, cost structures, and tax rates for sales quotations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchProducts()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or description..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
          />
        </form>

        <div className="flex items-center space-x-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-cyan-500 transition"
          >
            <option value="ALL">All Categories</option>
            <option value="SOFTWARE">Software / Subscriptions</option>
            <option value="HARDWARE">Hardware Devices</option>
            <option value="SERVICE">Consulting & Services</option>
            <option value="GENERAL">General</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs">Loading product catalog...</div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold">No products in catalog</p>
            <p className="text-xs text-slate-500">Create your first product or service to enable line-item CPQ quotes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product / Service Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Tax Rate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-cyan-400 whitespace-nowrap">{p.sku}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{p.name}</div>
                      {p.description && <div className="text-[11px] text-slate-500 truncate max-w-sm">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      ${p.unitPrice?.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/ {p.unit}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                      {p.taxRate}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenModal(p)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-300 border border-slate-800 hover:border-rose-500/30 transition"
                          title="Delete / Deactivate"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-base font-bold text-white tracking-tight">
                {editingProduct ? 'Edit Catalog Product' : 'Add Product to Catalog'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Enterprise Cloud License"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. SWN-CLD-ENT"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono uppercase focus:outline-none focus:border-cyan-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="GENERAL">General</option>
                    <option value="SOFTWARE">Software / SaaS</option>
                    <option value="HARDWARE">Hardware</option>
                    <option value="SERVICE">Professional Service</option>
                    <option value="SUBSCRIPTION">Recurring Subscription</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Billing Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="UNIT">Unit</option>
                    <option value="LICENSE">License</option>
                    <option value="HOUR">Hour</option>
                    <option value="MONTH">Month</option>
                    <option value="PROJECT">Project</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Commercial product specs, SLA scope, or terms..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="isActive" className="text-xs text-slate-300">
                  Active in sales catalog (available for quotes)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
