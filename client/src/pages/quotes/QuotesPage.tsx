import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  XCircle,
  Building2,
  User,
  RefreshCw,
  X,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const QuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Creation form state
  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [contactId, setContactId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [terms, setTerms] = useState('Net 30 days. Standard service level agreement applies.');
  const [lineItems, setLineItems] = useState<any[]>([
    { productId: '', name: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await apiClient.get(`/quotes?${params.toString()}`);
      if (res.success) {
        setQuotes(res.data.quotes || []);
      }
    } catch (err) {
      console.error('Failed to load quotes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter]);

  const handleOpenCreate = async () => {
    setFormError(null);
    setSubject('');
    setContactId('');
    setValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setDiscountPercent(0);
    setLineItems([{ productId: '', name: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
    setIsCreateOpen(true);

    try {
      const [contactsRes, productsRes] = await Promise.all([
        apiClient.get('/contacts'),
        apiClient.get('/products?isActive=true'),
      ]);
      if (contactsRes.success) setContacts(contactsRes.data || []);
      if (productsRes.success) setProducts(productsRes.data.products || []);
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const selected = products.find((p) => p.id === prodId);
    const updated = [...lineItems];
    if (selected) {
      updated[index] = {
        ...updated[index],
        productId: selected.id,
        name: selected.name,
        unitPrice: selected.unitPrice,
        taxRate: selected.taxRate || 0,
      };
    } else {
      updated[index].productId = '';
    }
    setLineItems(updated);
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: val };
    setLineItems(updated);
  };

  const addItemRow = () => {
    setLineItems([...lineItems, { productId: '', name: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const computeTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    lineItems.forEach((item) => {
      const base = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      const discounted = base * (1 - (Number(item.discount) || 0) / 100);
      const lineTax = discounted * ((Number(item.taxRate) || 0) / 100);
      subtotal += discounted;
      taxAmount += lineTax;
    });
    const discAmount = (subtotal * (Number(discountPercent) || 0)) / 100;
    const grandTotal = Math.max(0, subtotal - discAmount + taxAmount);
    return { subtotal, discAmount, taxAmount, grandTotal };
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setFormError('Quote Subject is required.');
      return;
    }
    if (lineItems.some((i) => !i.name.trim() || Number(i.unitPrice) < 0)) {
      setFormError('Please specify valid names and prices for all line items.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await apiClient.post('/quotes', {
        subject: subject.trim(),
        contactId: contactId || null,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        discountPercent: Number(discountPercent),
        currency,
        terms,
        items: lineItems.map((item) => ({
          productId: item.productId || null,
          name: item.name.trim(),
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0,
          taxRate: Number(item.taxRate) || 0,
        })),
      });

      if (res.success) {
        setIsCreateOpen(false);
        fetchQuotes();
      } else {
        setFormError(res.error || 'Failed to create quotation');
      }
    } catch (err: any) {
      setFormError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">DRAFT</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">SENT</span>;
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACCEPTED</span>;
      case 'DECLINED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">DECLINED</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">EXPIRED</span>;
      default:
        return null;
    }
  };

  const totals = computeTotals();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">Quotations & CPQ Orders</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              SALES ESTIMATES
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure line items, discounts, warranties, and convert accepted quotes into Sales Orders and Invoices.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchQuotes()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quote</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-1 overflow-x-auto text-xs">
          {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-semibold ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All Quotes' : st}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchQuotes(); }} className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
          />
        </form>
      </div>

      {/* Quotes Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs">Loading sales quotations...</div>
        ) : quotes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold">No quotations found</p>
            <p className="text-xs text-slate-500">Create a quote from your product catalog to initiate commercial negotiations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">Quote #</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Customer / Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Valid Until</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="hover:bg-slate-900/60 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-cyan-400 whitespace-nowrap">{q.quoteNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100 max-w-sm truncate">{q.subject}</div>
                      {q.deal && <div className="text-[10px] text-slate-500 font-mono">Deal: {q.deal.title}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {q.contact ? (
                        <div>
                          <div className="font-medium text-slate-200">{q.contact.firstName} {q.contact.lastName}</div>
                          {q.company && <div className="text-[10px] text-slate-500">{q.company.name}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(q.status)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      ${q.total?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/quotes/${q.id}`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium inline-flex items-center space-x-1 transition"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Quote Modal Wizard */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white tracking-tight">Generate Sales Quotation</h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quote Subject *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Annual Enterprise Subscription & Implementation"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer / Contact</label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
                  >
                    <option value="">No Contact Linked</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Quotation Line Items
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-semibold flex items-center space-x-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-4">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition mb-1"
                        >
                          <option value="">Choose Catalog Product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.unitPrice})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="Item Description / Title"
                          className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 font-mono block">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 font-mono block">Unit Price ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 font-mono block">Tax (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                          className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-1 text-right font-mono font-bold text-slate-200">
                        ${(
                          (item.quantity || 1) *
                          (item.unitPrice || 0) *
                          (1 + (item.taxRate || 0) / 100)
                        ).toLocaleString()}
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={lineItems.length <= 1}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">${totals.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <div className="flex items-center space-x-2">
                    <span>Overall Discount (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs"
                    />
                  </div>
                  <span className="font-mono text-rose-400">-${totals.discAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Taxes</span>
                  <span className="font-mono text-slate-200">+${totals.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white border-t border-slate-800 pt-2">
                  <span>Grand Total</span>
                  <span className="font-mono text-emerald-400">${totals.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Commercial Terms</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Creating Quote...' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
