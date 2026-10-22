import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  ShoppingCart,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Building2,
  User,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const QuoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  const fetchQuote = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/quotes/${id}`);
      if (res.success) {
        setQuote(res.data);
      }
    } catch (err) {
      console.error('Failed to load quote details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await apiClient.patch(`/quotes/${id}`, { status: newStatus });
      if (res.success) {
        setQuote(res.data);
      }
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleConvertToOrder = async () => {
    if (!confirm('Convert this quotation into a confirmed Sales Order?')) return;
    setIsConverting(true);
    try {
      const res = await apiClient.post(`/quotes/${id}/convert-to-order`, {});
      if (res.success) {
        alert(res.message);
        fetchQuote();
      }
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!confirm('Convert this quotation directly into a commercial Customer Invoice?')) return;
    setIsConverting(true);
    try {
      const res = await apiClient.post(`/quotes/${id}/convert-to-invoice`, {});
      if (res.success) {
        alert(res.message);
        navigate(`/customer-invoices`);
      }
    } catch (err: any) {
      alert(`Invoice generation failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return <div className="py-24 text-center text-slate-500 font-mono text-xs">Loading quote details...</div>;
  }

  if (!quote) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <p className="text-base font-semibold">Quote not found</p>
        <button
          onClick={() => navigate('/quotes')}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
        >
          Return to Quotes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/quotes')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-cyan-400">{quote.quoteNumber}</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {quote.status}
              </span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">{quote.subject}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={handleConvertToOrder}
            disabled={isConverting}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4 text-cyan-400" />
            <span>Convert to Order</span>
          </button>

          <button
            onClick={handleConvertToInvoice}
            disabled={isConverting}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Receipt className="w-4 h-4" />
            <span>Generate Invoice</span>
          </button>
        </div>
      </div>

      {/* Quote Document Body */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6 bg-[#0B1120]">
        {/* Parties Header */}
        <div className="grid grid-cols-2 gap-8 border-b border-slate-800 pb-6 text-xs">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
              Issued By (Vendor)
            </span>
            <div className="font-bold text-slate-100 text-sm">SwordNex AI Platform</div>
            <p className="text-slate-400 mt-0.5">Enterprise Cloud Software & Services</p>
            <p className="text-slate-500 font-mono text-[11px] mt-1">support@swordnex.com</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
              Quotation Recipient
            </span>
            <div className="font-bold text-slate-100 text-sm">
              {quote.contact ? `${quote.contact.firstName} ${quote.contact.lastName}` : 'Direct Customer'}
            </div>
            {quote.company && <p className="text-slate-300 font-medium">{quote.company.name}</p>}
            {quote.contact?.email && <p className="text-slate-400 font-mono text-[11px]">{quote.contact.email}</p>}
            <div className="mt-2 text-slate-500 font-mono text-[11px]">
              Valid Until: {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'Net 30 Days'}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="px-4 py-2.5">Item & Description</th>
                <th className="px-4 py-2.5 text-center">Qty</th>
                <th className="px-4 py-2.5 text-right">Unit Price</th>
                <th className="px-4 py-2.5 text-right">Tax Rate</th>
                <th className="px-4 py-2.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {quote.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100">{item.name}</div>
                    {item.product?.sku && (
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1 rounded">
                        SKU: {item.product.sku}
                      </span>
                    )}
                    {item.description && <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono">${item.unitPrice?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{item.taxRate}%</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                    ${item.total?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono text-slate-200">${quote.subtotal?.toLocaleString()}</span>
            </div>
            {quote.discountAmount > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Discount ({quote.discountPercent}%)</span>
                <span className="font-mono text-rose-400">-${quote.discountAmount?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Total Tax</span>
              <span className="font-mono text-slate-200">+${quote.taxAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white border-t border-slate-800 pt-2">
              <span>Grand Total</span>
              <span className="font-mono text-emerald-400">${quote.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {quote.terms && (
          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px] block mb-1">
              Terms & Conditions
            </span>
            <p className="leading-relaxed whitespace-pre-wrap">{quote.terms}</p>
          </div>
        )}
      </div>
    </div>
  );
};
