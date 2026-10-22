import React, { useState, useEffect } from 'react';
import {
  Receipt,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  ArrowRight,
  CreditCard,
  X,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const CustomerInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [agingSummary, setAgingSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment recording modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const [invoicesRes, agingRes] = await Promise.all([
        apiClient.get(`/customer-invoices?${params.toString()}`),
        apiClient.get('/customer-invoices/aging-summary'),
      ]);

      if (invoicesRes.success) {
        setInvoices(invoicesRes.data.invoices || []);
      }
      if (agingRes.success) {
        setAgingSummary(agingRes.data);
      }
    } catch (err) {
      console.error('Failed to load commercial invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleOpenPayment = (inv: any) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.amountDue || inv.total);
    setPaymentMethod('BANK_TRANSFER');
    setReferenceNumber('');
    setPaymentNotes('');
    setPaymentError(null);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    setIsRecording(true);
    setPaymentError(null);

    try {
      const res = await apiClient.post(`/customer-invoices/${selectedInvoice.id}/payments`, {
        amount: Number(paymentAmount),
        paymentMethod,
        referenceNumber: referenceNumber.trim() || null,
        notes: paymentNotes.trim() || null,
      });

      if (res.success) {
        setSelectedInvoice(null);
        fetchData();
      } else {
        setPaymentError(res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment recording failed');
    } finally {
      setIsRecording(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            PAID
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            PARTIAL
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            OVERDUE
          </span>
        );
      case 'SENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            SENT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">Customer Invoices & Receivables</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AGING LEDGER
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Commercial invoicing, collections tracking, aging analysis, and payment reconciliations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchData()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Receivables Aging Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase font-mono block">Total Receivables</span>
          <p className="text-lg font-black text-white mt-1">
            ${(agingSummary?.summary?.totalReceivables || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500">{agingSummary?.summary?.openInvoiceCount || 0} open bills</span>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-cyan-400 uppercase font-mono block">Current (Not Due)</span>
          <p className="text-lg font-black text-cyan-400 mt-1">
            ${(agingSummary?.agingBuckets?.current || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-cyan-400/80">Within terms</span>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-amber-400 uppercase font-mono block">1 - 30 Days Due</span>
          <p className="text-lg font-black text-amber-400 mt-1">
            ${(agingSummary?.agingBuckets?.days1to30 || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-amber-400/80">Follow-up due</span>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-orange-400 uppercase font-mono block">31 - 60 Days Due</span>
          <p className="text-lg font-black text-orange-400 mt-1">
            ${(agingSummary?.agingBuckets?.days31to60 || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-orange-400/80">Past due</span>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-rose-400 uppercase font-mono block">61 - 90+ Days Due</span>
          <p className="text-lg font-black text-rose-400 mt-1">
            ${(
              (agingSummary?.agingBuckets?.days61to90 || 0) +
              (agingSummary?.agingBuckets?.days90plus || 0)
            ).toLocaleString()}
          </p>
          <span className="text-[10px] text-rose-400/80">Critical aging</span>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-semibold text-emerald-400 uppercase font-mono block">Total Collected</span>
          <p className="text-lg font-black text-emerald-400 mt-1">
            ${(agingSummary?.summary?.totalCollected || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-400/80">Bank deposits</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-1 overflow-x-auto text-xs">
          {['ALL', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-semibold ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All Invoices' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
          />
        </form>
      </div>

      {/* Invoices List Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs">Loading commercial invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold">No commercial invoices found</p>
            <p className="text-xs text-slate-500">Invoices generated from accepted quotes will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Customer / Contact</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Amount Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {inv.contact ? (
                        <div>
                          <div className="font-semibold text-slate-100">{inv.contact.firstName} {inv.contact.lastName}</div>
                          {inv.company && <div className="text-[10px] text-slate-500">{inv.company.name}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Direct Customer</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-200 whitespace-nowrap">
                      ${inv.total?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                      {inv.amountDue > 0 ? (
                        <span className="text-rose-400">${inv.amountDue?.toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-400">$0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(inv.status)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {inv.amountDue > 0 ? (
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold inline-flex items-center space-x-1 transition"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>
                      ) : (
                        <span className="text-emerald-400 text-xs font-mono font-bold flex items-center justify-end space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white tracking-tight">Record Payment</h2>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4 text-xs">
              {paymentError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
                  {paymentError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Invoice Reference:</span>
                  <span className="font-mono font-bold text-cyan-400">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono font-bold text-rose-400">${selectedInvoice.amountDue?.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Amount ($) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedInvoice.amountDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono text-sm focus:outline-none focus:border-cyan-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="BANK_TRANSFER">Bank Wire / ACH / NEFT</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="UPI">UPI</option>
                  <option value="CHECK">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Ref / Cheque #</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR-98273618 or Check #402"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment receipt notes or bank reconciliation details..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold border border-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecording}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
                >
                  {isRecording ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
