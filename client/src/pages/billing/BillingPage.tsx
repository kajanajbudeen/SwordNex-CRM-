import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  Sparkles,
  Shield,
  Cpu,
  Users,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Lock,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  X,
  Receipt,
  Database,
  Calendar,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface PlanConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxUsers: number;
  maxCustomRoles: number;
  maxStorageMb: number;
  maxLeads: number;
  maxAiTokens: number;
  allowedModules: string[];
  aiFeaturesEnabled: boolean;
  reportExportEnabled: boolean;
  apiAccessEnabled: boolean;
  supportLevel: string;
  trialDays: number;
  gracePeriodDays: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  currency: string;
  status: string;
  billingInterval: string;
  planSlug: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  pdfUrl?: string;
  createdAt: string;
}

export const BillingPage: React.FC = () => {
  const { currentOrg, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [isLoading, setIsLoading] = useState(true);

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Downgrade / Cancel Modal State
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Invoice Printable View Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      const [plansRes, currRes, invRes] = await Promise.all([
        apiClient.get('/plans'),
        apiClient.get('/subscriptions/current'),
        apiClient.get('/subscriptions/invoices'),
      ]);

      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data);
      }
      if (currRes.success && currRes.data) {
        setCurrentSub(currRes.data);
        if (currRes.data.subscription?.billingInterval) {
          setBillingInterval(currRes.data.subscription.billingInterval);
        }
      }
      if (invRes.success && invRes.data) {
        setInvoices(invRes.data);
      }
    } catch (err) {
      console.error('Failed to load billing details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleOpenCheckout = async (plan: PlanConfig) => {
    setSelectedPlan(plan);
    setPaymentError(null);
    setPaymentSuccess(null);
    setIsProcessingPayment(true);
    setCheckoutModalOpen(true);

    try {
      const res = await apiClient.post('/subscriptions/checkout', {
        planSlug: plan.slug,
        billingInterval,
      });

      if (res.success && res.data) {
        setCheckoutOrder(res.data);
      } else {
        setPaymentError(res.message || 'Failed to initialize payment order');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment initiation error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProceedPayment = async () => {
    if (!checkoutOrder || !selectedPlan) return;
    setIsProcessingPayment(true);
    setPaymentError(null);

    const keyId = checkoutOrder.razorpayKeyId;
    const isMockKey = !keyId || keyId.includes('mock') || keyId.includes('swordnex_test');

    // If key is present, invoke standard Razorpay Checkout
    if (!isMockKey) {
      const isLoaded = await loadRazorpayScript();
      if (isLoaded && (window as any).Razorpay) {
        try {
          const options = {
            key: keyId,
            amount: Math.round((checkoutOrder.totalPayable || (checkoutOrder.amount * 1.18)) * 100),
            currency: checkoutOrder.currency || 'INR',
            name: 'SwordNex AI CRM',
            description: `${selectedPlan.name} Subscription (${billingInterval})`,
            order_id: checkoutOrder.orderId?.startsWith('order_') ? checkoutOrder.orderId : undefined,
            handler: async (response: any) => {
              setIsProcessingPayment(true);
              try {
                const res = await apiClient.post('/subscriptions/verify', {
                  orderId: response.razorpay_order_id || checkoutOrder.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  planSlug: selectedPlan.slug,
                  billingInterval,
                  paymentRecordId: checkoutOrder.paymentRecordId,
                });

                if (res.success && res.data) {
                  setPaymentSuccess(res.data);
                  await refreshProfile();
                  await fetchBillingData();
                } else {
                  setPaymentError(res.message || 'Payment verification failed');
                }
              } catch (verifyErr: any) {
                setPaymentError(verifyErr.response?.data?.message || verifyErr.message || 'Payment verification failed');
              } finally {
                setIsProcessingPayment(false);
              }
            },
            prefill: {
              name: currentOrg?.name || '',
            },
            notes: {
              organizationId: currentOrg?.id || '',
              planSlug: selectedPlan.slug,
              billingInterval,
            },
            theme: {
              color: '#06B6D4',
            },
            modal: {
              ondismiss: () => {
                setIsProcessingPayment(false);
              },
            },
          };

          const rzpInstance = new (window as any).Razorpay(options);
          rzpInstance.on('payment.failed', function (failResp: any) {
            setPaymentError(failResp.error?.description || 'Payment was declined or failed.');
            setIsProcessingPayment(false);
          });
          rzpInstance.open();
          return;
        } catch (err: any) {
          console.error('Razorpay popup error:', err);
        }
      }
    }

    // Sandbox / Test fallback verification
    try {
      const mockPaymentId = `pay_snx_${Date.now()}`;
      const mockSignature = `sig_test_${Date.now()}`;

      const res = await apiClient.post('/subscriptions/verify', {
        orderId: checkoutOrder.orderId,
        paymentId: mockPaymentId,
        signature: mockSignature,
        planSlug: selectedPlan.slug,
        billingInterval,
        paymentRecordId: checkoutOrder.paymentRecordId,
      });

      if (res.success && res.data) {
        setPaymentSuccess(res.data);
        await refreshProfile();
        await fetchBillingData();
      } else {
        setPaymentError(res.message || 'Payment verification failed');
      }
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDowngrade = async (targetSlug: string) => {
    setIsProcessingAction(true);
    try {
      const res = await apiClient.post('/subscriptions/downgrade', {
        targetPlanSlug: targetSlug,
        targetBillingInterval: billingInterval,
      });
      if (res.success) {
        alert(res.message);
        setDowngradeModalOpen(false);
        fetchBillingData();
      }
    } catch (err: any) {
      alert(`Downgrade error: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsProcessingAction(true);
    try {
      const res = await apiClient.post('/subscriptions/cancel');
      if (res.success) {
        alert(res.message || 'Subscription cancelled. Access remains active until the end of your billing cycle.');
        setCancelModalOpen(false);
        fetchBillingData();
      }
    } catch (err: any) {
      alert(`Cancellation error: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono animate-pulse flex flex-col items-center justify-center space-y-3">
        <Cpu className="w-8 h-8 text-cyan-400 animate-spin" />
        <span>Synchronizing SaaS Subscription Gateway & Invoices...</span>
      </div>
    );
  }

  const subscription = currentSub?.subscription;
  const trialStatus = currentSub?.trialStatus;
  const usage = currentSub?.usage || {};
  const activePlanConfig = currentSub?.planConfig;

  // Commercial standard and premium plans
  const commercialPlans = plans.filter((p) => p.slug !== 'FREE_TRIAL');

  return (
    <div className="space-y-6">
      {/* Page Title & Interval Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>SaaS Subscription & Resource Quotas</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {subscription?.plan || 'STANDARD'} • {subscription?.billingInterval || 'MONTHLY'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Scalable plans for growing teams: Transparent pricing in INR (₹) with standard & premium tiers.
          </p>
        </div>

        {/* Monthly vs Yearly Toggle Switch */}
        <div className="flex items-center space-x-3 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setBillingInterval('MONTHLY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              billingInterval === 'MONTHLY'
                ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingInterval('YEARLY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              billingInterval === 'YEARLY'
                ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              SAVE ~17%
            </span>
          </button>
        </div>
      </div>

      {/* Trial Countdown or Grace Period Banner */}
      {trialStatus?.isTrialExpired && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 to-slate-900 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-200">15-Day Free Trial Expired — Write Operations Blocked</h4>
              <p className="text-xs text-rose-300/80">
                Your CRM workspace is currently read-only. Select Standard or Premium below to restore full write capability.
              </p>
            </div>
          </div>
        </div>
      )}

      {trialStatus?.isGracePeriodActive && !trialStatus?.isTrialExpired && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">Grace Period Active (3 Days Remaining)</h4>
              <p className="text-xs text-amber-300/80">
                Your trial has ended. Please renew to ensure continuous CRM automation and avoid write disruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {subscription?.plan === 'FREE_TRIAL' && !trialStatus?.isTrialExpired && !trialStatus?.isGracePeriodActive && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-white">SwordNex 15-Day Free Trial Active</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                  {trialStatus?.trialDaysRemaining ?? 15} DAYS REMAINING
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Up to 5 users, 15,000 leads, and 500,000 AI tokens included. Upgrade below to remove limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Resource Usage Meters Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Organization Resource Usage & Quota Meters</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Billing Cycle Ends: {new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active User Seats Meter */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>User Seats</span>
              <span>
                {usage.seatsUsed || 1} / {usage.seatLimit || 5}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((usage.seatsUsed || 1) / (usage.seatLimit || 5)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-2">
              {Math.max(0, (usage.seatLimit || 5) - (usage.seatsUsed || 1))} seats available
            </p>
          </div>

          {/* Leads Database Meter */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Leads Capacity</span>
              <span>
                {(usage.leadsUsed || 0).toLocaleString()} / {(usage.leadLimit || 15000).toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((usage.leadsUsed || 0) / (usage.leadLimit || 15000)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-2">
              {Math.max(0, (usage.leadLimit || 15000) - (usage.leadsUsed || 0)).toLocaleString()} leads remaining
            </p>
          </div>

          {/* AI Token Quota */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Monthly AI Tokens</span>
              <span>
                {Math.round((usage.aiTokensUsed || 0) / 1000)}k / {Math.round((usage.aiTokenLimit || 500000) / 1000)}k
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-purple-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((usage.aiTokensUsed || 0) / (usage.aiTokenLimit || 500000)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-2">
              Copilot & Autonomous Agents quota
            </p>
          </div>

          {/* Secure Cloud Storage */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Cloud Storage</span>
              <span>
                {usage.storageMbUsed || 24} MB / {usage.storageMbLimit || 1000} MB
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-blue-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((usage.storageMbUsed || 24) / (usage.storageMbLimit || 1000)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-2">
              Attachments, contracts, proposals
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Plans: Standard & Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {commercialPlans.map((plan) => {
          const isCurrent =
            subscription?.plan === plan.slug &&
            subscription?.status === 'ACTIVE' &&
            subscription?.billingInterval === billingInterval;

          const price = billingInterval === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
          const monthlyEquivalent =
            billingInterval === 'YEARLY' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
          const subtotal = price;
          const tax = Math.round(subtotal * 0.18 * 100) / 100;
          const totalWithTax = subtotal + tax;

          return (
            <div
              key={plan.slug}
              className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between transition relative ${
                isCurrent
                  ? 'border-cyan-400 shadow-glow-cyan bg-cyan-950/15'
                  : plan.slug === 'PREMIUM'
                  ? 'border-cyan-500/40 hover:border-cyan-400 bg-slate-900/60'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
              }`}
            >
              {plan.slug === 'PREMIUM' && (
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-cyan-500 to-violet-600 text-slate-950 text-[10px] font-black uppercase font-mono px-3 py-0.5 rounded-full shadow-md">
                  Recommended for Growing Teams
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-extrabold text-white text-lg tracking-tight">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      CURRENT PLAN
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-4">{plan.description}</p>

                {/* Price Display in INR with 18% GST breakdown */}
                <div className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl font-black text-white font-mono">₹{price.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      / {billingInterval === 'YEARLY' ? 'year' : 'month'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                    <span>GST (18%): ₹{tax.toLocaleString('en-IN')}</span>
                    <span className="text-cyan-300 font-bold">Total: ₹{totalWithTax.toLocaleString('en-IN')}</span>
                  </div>
                  {billingInterval === 'YEARLY' ? (
                    <p className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center space-x-1">
                      <span>✓ Effective ₹{monthlyEquivalent.toLocaleString('en-IN')}/mo</span>
                      <span className="text-slate-400">(Includes 2 months free)</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      Billed monthly. Save ~17% by switching to annual billing.
                    </p>
                  )}
                </div>

                {/* Granular Limits & Feature Inclusions */}
                <div className="space-y-2.5 text-xs text-slate-300">
                  <p className="font-mono text-cyan-400 text-[11px] font-bold uppercase tracking-wider">
                    PLAN SPECIFICATIONS:
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 font-semibold text-slate-100">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>Up to {plan.maxUsers} User Accounts Included</span>
                    </div>
                    <div className="flex items-center space-x-2 font-semibold text-slate-100">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>{plan.maxCustomRoles} Configurable Custom RBAC Roles</span>
                    </div>
                    <div className="flex items-center space-x-2 font-semibold text-slate-100">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>{plan.maxLeads.toLocaleString()} Leads Database Capacity</span>
                    </div>
                    <div className="flex items-center space-x-2 font-semibold text-slate-100">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>{(plan.maxAiTokens / 1000).toLocaleString()}k Monthly AI Tokens</span>
                    </div>
                    <div className="flex items-center space-x-2 font-semibold text-slate-100">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>{(plan.maxStorageMb / 1000).toFixed(0)} GB Secure Cloud Storage</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>
                        Modules: {plan.allowedModules.map((m) => m.toLowerCase().replace('_', ' ')).join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Support Tier: {plan.supportLevel} Response Guarantee</span>
                    </div>
                    {plan.apiAccessEnabled && (
                      <div className="flex items-center space-x-2 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>REST API & Webhook Ingestion Access</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => handleOpenCheckout(plan)}
                  disabled={isCurrent}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                    isCurrent
                      ? 'bg-slate-800 text-slate-400 cursor-default border border-slate-700'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-glow-cyan'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      <span>Active Subscription ({billingInterval.toLowerCase()})</span>
                    </>
                  ) : (
                    <span>
                      Upgrade to {plan.name} (₹{price.toLocaleString('en-IN')}/{billingInterval === 'YEARLY' ? 'yr' : 'mo'})
                    </span>
                  )}
                </button>

                {isCurrent && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1 pt-1">
                    <button
                      onClick={() => setDowngradeModalOpen(true)}
                      className="hover:text-amber-400 hover:underline"
                    >
                      Schedule Downgrade
                    </button>
                    <button
                      onClick={() => setCancelModalOpen(true)}
                      className="hover:text-rose-400 hover:underline"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices & Payment History Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 font-mono">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Tax Invoices & Official Payment Receipts</span>
            </h3>
            <p className="text-xs text-slate-400">Download GST tax receipts with legal company headers and transaction IDs.</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No tax invoices generated yet for this organization.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Plan & Cycle</th>
                  <th className="py-3 px-3">Amount (INR)</th>
                  <th className="py-3 px-3">Tax (18% GST)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-3 font-bold text-cyan-300">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-400">{new Date(inv.paidAt || inv.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-slate-200 uppercase">
                      {inv.planSlug} • {inv.billingInterval}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">₹{inv.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-slate-400">₹{(inv.tax || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 ml-auto text-[11px]"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View / Print Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Razorpay / Gateway Simulated Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-cyan-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative font-mono">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-sm">
                  ₹
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Razorpay Secure Checkout</h3>
                  <p className="text-[11px] text-slate-400 font-mono">SwordNex Technologies Pvt. Ltd.</p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {paymentError && (
                <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {paymentSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">Subscription Activated!</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    Thank you! Your workspace has been upgraded to <strong>{selectedPlan?.name}</strong>. Invoice{' '}
                    <strong>{paymentSuccess.invoice?.invoiceNumber}</strong> has been generated and emailed.
                  </p>
                  <button
                    onClick={() => setCheckoutModalOpen(false)}
                    className="mt-4 px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Plan Selected:</span>
                      <strong className="text-white">{selectedPlan?.name}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Billing Interval:</span>
                      <strong className="text-white">{billingInterval}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal:</span>
                      <strong className="text-white">₹{(checkoutOrder?.amount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>GST (18%):</span>
                      <strong className="text-white">
                        ₹{Math.round((checkoutOrder?.amount || 0) * 0.18).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
                      <span className="font-bold text-slate-200">Total Payable (INR):</span>
                      <span className="font-extrabold text-cyan-300 font-mono">
                        ₹
                        {(
                          (checkoutOrder?.amount || 0) + Math.round((checkoutOrder?.amount || 0) * 0.18)
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between text-xs text-cyan-300">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span>256-Bit SSL Encrypted Razorpay Gateway • Instant Activation</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                      {checkoutOrder?.razorpayKeyId?.startsWith('rzp_live') ? 'LIVE GATEWAY' : 'SECURE TEST GATEWAY'}
                    </span>
                  </div>

                  <button
                    onClick={handleProceedPayment}
                    disabled={isProcessingPayment || !checkoutOrder}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs transition flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Cpu className="w-4 h-4 animate-spin" />
                        <span>Verifying Cryptographic Payment...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          Pay ₹
                          {(
                            (checkoutOrder?.amount || 0) + Math.round((checkoutOrder?.amount || 0) * 0.18)
                          ).toLocaleString('en-IN')}{' '}
                          with Razorpay
                        </span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Downgrade Modal */}
      {downgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 font-mono text-xs text-slate-300 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Schedule Plan Downgrade</span>
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Your subscription will remain active on your current tier until the end of your billing cycle. On your renewal date, you will seamlessly transition to the Standard tier.
            </p>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400">
              ✓ All customer records, leads, and historical data are 100% preserved.
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button onClick={() => setDowngradeModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400">
                Cancel
              </button>
              <button
                onClick={() => handleDowngrade('STANDARD')}
                disabled={isProcessingAction}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                {isProcessingAction ? 'Scheduling...' : 'Confirm Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 font-mono text-xs text-slate-300 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Cancel Subscription</span>
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Are you sure you want to cancel your recurring subscription? Your organization will retain full write and AI access until the end of your prepaid period.
            </p>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
              Access remains active until: <strong className="text-white">{new Date(subscription?.currentPeriodEnd || Date.now()).toLocaleDateString()}</strong>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button onClick={() => setCancelModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400">
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isProcessingAction}
                className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold"
              >
                {isProcessingAction ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1322] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 font-mono text-xs text-slate-300 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-lg font-black text-white tracking-tight">TAX INVOICE</span>
                <p className="text-[11px] text-cyan-400">SwordNex Technologies Private Limited</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Service Provider:</p>
                <p className="font-bold text-white">SwordNex Technologies Pvt. Ltd.</p>
                <p className="text-[11px]">GSTIN: 29AABCS1429B1Z5</p>
                <p className="text-[11px]">CIN: U72900KA2024PTC123456</p>
                <p className="text-[11px]">Cyber Gateway, Bengaluru, India</p>
              </div>

              <div>
                <p className="text-slate-500 text-[10px] uppercase">Customer:</p>
                <p className="font-bold text-white">{currentOrg?.name}</p>
                <p className="text-[11px]">Invoice #: {selectedInvoice.invoiceNumber}</p>
                <p className="text-[11px]">
                  Date: {new Date(selectedInvoice.paidAt || selectedInvoice.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                  <tr>
                    <th className="p-3">Plan Tier</th>
                    <th className="p-3">Period</th>
                    <th className="p-3 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-white">
                      SwordNex AI CRM — {selectedInvoice.planSlug} ({selectedInvoice.billingInterval})
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(selectedInvoice.periodStart).toLocaleDateString()} -{' '}
                      {new Date(selectedInvoice.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right font-bold text-white">
                      ₹{selectedInvoice.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-right text-xs">
              <p>
                Subtotal: <strong className="text-white">₹{selectedInvoice.amount.toLocaleString('en-IN')}</strong>
              </p>
              <p>
                GST (18%): <strong className="text-white">₹{(selectedInvoice.tax || 0).toLocaleString('en-IN')}</strong>
              </p>
              <p className="text-sm border-t border-slate-800 pt-2 font-bold text-cyan-300">
                Total Paid: ₹{((selectedInvoice.amount || 0) + (selectedInvoice.tax || 0)).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              <span>Status: <strong className="text-emerald-400">PAID (CONFIRMED)</strong></span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center space-x-1.5 shadow-glow-cyan"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
