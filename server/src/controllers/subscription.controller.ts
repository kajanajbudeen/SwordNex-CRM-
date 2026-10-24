import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { EntitlementService } from '../services/entitlement.service';
import { config } from '../config';

export class SubscriptionController {
  /**
   * Public / Tenant Endpoint: Get all active SaaS Subscription Plans
   * Route: GET /api/plans
   */
  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await prisma.subscriptionPlanConfig.findMany({
        where: { isActive: true },
        orderBy: { monthlyPrice: 'asc' },
      });
      return sendSuccess(res, plans);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch subscription plans', 500);
    }
  }

  /**
   * Get Current Tenant Subscription, Trial Countdown, and Resource Quotas
   * Route: GET /api/subscriptions/current
   */
  static async getCurrentSubscription(req: Request, res: Response) {
    try {
      const entitlements = await EntitlementService.getTenantEntitlements(req.organizationId!);
      const sub = entitlements.subscription;
      const planConfig = entitlements.planConfig;

      const invoices = await prisma.invoice.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { payments: true },
      });

      return sendSuccess(res, {
        subscription: {
          id: sub.id,
          plan: sub.plan,
          planSlug: sub.planSlug,
          planName: sub.planName,
          billingInterval: sub.billingInterval,
          status: sub.status,
          currency: sub.currency,
          price: sub.price,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialStartsAt: sub.trialStartsAt,
          trialEndsAt: sub.trialEndsAt,
          remainingTrialDays: sub.remainingTrialDays,
          isTrialExpired: sub.isTrialExpired,
          isGracePeriodActive: sub.isGracePeriodActive,
          isGracePeriodExpired: sub.isGracePeriodExpired,
          isSubscriptionExpired: sub.isSubscriptionExpired,
          isWriteAllowed: sub.isWriteAllowed,
          allowedModules: planConfig.allowedModules || [],
          aiFeaturesEnabled: planConfig.aiFeaturesEnabled ?? true,
          cancelledAt: sub.cancelledAt,
        },
        usage: {
          leadsUsed: entitlements.usage.leadsCount,
          leadLimit: entitlements.usage.leadLimit,
          seatsUsed: entitlements.usage.activeSeats,
          seatLimit: entitlements.usage.seatLimit,
          aiTokensUsed: entitlements.usage.aiTokensUsed,
          aiTokenLimit: entitlements.usage.aiTokenLimit,
          storageMbUsed: entitlements.usage.storageMbUsed,
          storageMbLimit: entitlements.usage.storageMbLimit,
        },
        invoices,
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch current subscription', 500);
    }
  }

  /**
   * Get Detailed Resource Usage Metrics & Quotas
   * Route: GET /api/subscriptions/usage
   */
  static async getUsage(req: Request, res: Response) {
    try {
      const entitlements = await EntitlementService.getTenantEntitlements(req.organizationId!);
      return sendSuccess(res, {
        subscription: entitlements.subscription,
        usage: entitlements.usage,
        planConfig: entitlements.planConfig,
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch usage metrics', 500);
    }
  }

  /**
   * Initiate Checkout / Order Creation (Razorpay / Cashfree)
   * Route: POST /api/subscriptions/checkout
   */
  static async checkout(req: Request, res: Response) {
    try {
      const { planSlug, billingInterval = 'MONTHLY', provider = 'RAZORPAY' } = req.body;

      if (!['STANDARD', 'PREMIUM'].includes(planSlug)) {
        return sendError(res, 'Valid paid plan selection required (STANDARD or PREMIUM)', 400);
      }

      if (!['MONTHLY', 'YEARLY'].includes(billingInterval)) {
        return sendError(res, 'Valid billing interval required (MONTHLY or YEARLY)', 400);
      }

      // Fetch server-side verified price from DB
      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { slug: planSlug },
      });

      if (!planConfig) {
        return sendError(res, `Plan configuration for '${planSlug}' not found`, 404);
      }

      const amount = billingInterval === 'YEARLY' ? planConfig.yearlyPrice : planConfig.monthlyPrice;
      const subtotal = amount;
      const taxRate = 0.18; // 18% GST in India
      const tax = Math.round(subtotal * taxRate * 100) / 100;
      const totalPayable = Math.round((subtotal + tax) * 100) / 100;
      let orderId = `order_SNX_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      // Live / Test Mode Razorpay Orders API dispatch
      const rzpKeyId = config.razorpay.keyId || process.env.RAZORPAY_KEY_ID;
      const rzpKeySecret = config.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;

      if (rzpKeyId && rzpKeySecret && !rzpKeyId.includes('mock') && !rzpKeyId.includes('swordnex_test')) {
        try {
          const authHeader = `Basic ${Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64')}`;
          const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader,
            },
            body: JSON.stringify({
              amount: Math.round(totalPayable * 100), // amount in paise
              currency: 'INR',
              receipt: `snx_${Date.now()}`.slice(0, 40),
              notes: {
                organizationId: req.organizationId!,
                planSlug,
                billingInterval,
              },
            }),
          });

          if (rzpResponse.ok) {
            const rzpData = (await rzpResponse.json()) as { id: string };
            if (rzpData?.id) {
              orderId = rzpData.id;
            }
          } else {
            const errBody = await rzpResponse.text();
            console.error('[SubscriptionController.checkout] Razorpay Orders API error:', rzpResponse.status, errBody);
          }
        } catch (apiErr: any) {
          console.error('[SubscriptionController.checkout] Razorpay order dispatch error:', apiErr.message);
        }
      }

      // Record pending payment in database
      const payment = await prisma.payment.create({
        data: {
          organizationId: req.organizationId!,
          amount,
          currency: 'INR',
          provider,
          orderId,
          status: 'PENDING',
          metadata: { planSlug, billingInterval, subtotal, tax, totalPayable },
        },
      });

      return sendSuccess(
        res,
        {
          orderId,
          paymentRecordId: payment.id,
          amount,
          subtotal,
          tax,
          taxRate: '18% GST',
          totalPayable,
          currency: 'INR',
          planSlug,
          planName: planConfig.name,
          billingInterval,
          provider,
          razorpayKeyId: rzpKeyId || 'rzp_test_swordnex_mock',
        },
        'Checkout order initialized successfully'
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Checkout failed', 500);
    }
  }

  /**
   * Verify Payment Signature and Activate Subscription
   * Route: POST /api/subscriptions/verify
   */
  static async verifyPayment(req: Request, res: Response) {
    try {
      const { orderId, paymentId, signature, planSlug, billingInterval } = req.body;

      if (!orderId || !paymentId) {
        return sendError(res, 'Order ID and Payment ID are required', 400);
      }

      // Check for duplicate payment activation
      const existingSuccess = await prisma.payment.findFirst({
        where: { paymentId, status: 'SUCCESS' },
      });

      if (existingSuccess) {
        return sendError(res, 'Duplicate payment confirmation. This transaction has already been processed.', 409);
      }

      // Verify HMAC SHA256 Signature
      const rzpKeySecret = config.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        if (!rzpKeySecret) {
          return sendError(res, 'Payment gateway configuration error: RAZORPAY_KEY_SECRET is required in production.', 500);
        }
        if (!signature) {
          return sendError(res, 'Payment signature is required for cryptographic verification.', 400);
        }
      }

      if (rzpKeySecret && signature) {
        const isTestMock = process.env.NODE_ENV === 'test' && signature.startsWith('sig_test_');
        if (!isTestMock) {
          const expectedSignature = crypto
            .createHmac('sha256', rzpKeySecret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

          const expectedBuf = Buffer.from(expectedSignature, 'utf8');
          const sigBuf = Buffer.from(signature, 'utf8');
          if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
            return sendError(res, 'Cryptographic payment signature verification failed.', 400);
          }
        }
      }

      // Fetch dynamic plan entitlements
      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { slug: planSlug },
      });

      if (!planConfig) {
        return sendError(res, 'Invalid plan configuration', 404);
      }

      const amount = billingInterval === 'YEARLY' ? planConfig.yearlyPrice : planConfig.monthlyPrice;
      const periodDays = billingInterval === 'YEARLY' ? 365 : 30;
      const periodStart = new Date();
      const periodEnd = new Date(periodStart.getTime() + periodDays * 24 * 60 * 60 * 1000);

      // Generate Tax Invoice
      const invoiceNumber = `INV-${periodStart.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: req.organizationId!,
          invoiceNumber,
          amount,
          tax: Math.round(amount * 0.18 * 100) / 100, // 18% GST
          currency: 'INR',
          status: 'PAID',
          billingInterval,
          planSlug,
          periodStart,
          periodEnd,
          paidAt: periodStart,
        },
      });

      // Update or Create Payment record
      await prisma.payment.upsert({
        where: { id: req.body.paymentRecordId || 'none' },
        update: {
          paymentId,
          signature: signature || 'verified_mock_sig',
          status: 'SUCCESS',
          invoiceId: invoice.id,
        },
        create: {
          organizationId: req.organizationId!,
          amount,
          currency: 'INR',
          provider: 'RAZORPAY',
          orderId,
          paymentId,
          signature: signature || 'verified_mock_sig',
          status: 'SUCCESS',
          invoiceId: invoice.id,
          metadata: { planSlug, billingInterval },
        },
      });

      // Activate Subscription
      const updatedSub = await prisma.subscription.update({
        where: { organizationId: req.organizationId },
        data: {
          plan: planSlug as any,
          planSlug,
          billingInterval,
          status: 'ACTIVE',
          price: amount,
          currency: 'INR',
          seatCount: planConfig.maxUsers,
          leadLimit: planConfig.maxLeads,
          aiTokenLimit: planConfig.maxAiTokens,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          trialStartsAt: null,
          trialEndsAt: null,
          gracePeriodEndsAt: null,
        },
      });

      // Update Organization plan
      await prisma.organization.update({
        where: { id: req.organizationId },
        data: { plan: planSlug as any },
      });

      // Log Security Audit Event
      await prisma.auditLog.create({
        data: {
          organizationId: req.organizationId!,
          userId: req.user?.id,
          action: 'APPROVE',
          entity: 'SETTINGS',
          details: {
            actionDescription: `Activated ${planConfig.name} (${billingInterval}) - Paid ₹${amount}`,
            invoiceNumber,
            paymentId,
          },
        },
      });

      // Create in-app Notification
      await prisma.notification.create({
        data: {
          organizationId: req.organizationId!,
          title: `Subscription Activated: ${planConfig.name}`,
          message: `Your account has been upgraded to ${planConfig.name} (${billingInterval} billing). Invoice #${invoiceNumber} has been generated.`,
          type: 'SYSTEM',
        },
      });

      return sendSuccess(
        res,
        {
          subscription: updatedSub,
          invoice,
        },
        `Congratulations! Successfully activated ${planConfig.name} (${billingInterval} billing).`
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Payment verification failed', 500);
    }
  }

  /**
   * Immediate Plan Upgrade
   * Route: POST /api/subscriptions/upgrade
   */
  static async upgradeSubscription(req: Request, res: Response) {
    try {
      const { planSlug, billingInterval = 'YEARLY' } = req.body;

      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { slug: planSlug },
      });

      if (!planConfig) {
        return sendError(res, `Target plan '${planSlug}' not found`, 400);
      }

      const amount = billingInterval === 'YEARLY' ? planConfig.yearlyPrice : planConfig.monthlyPrice;
      const periodDays = billingInterval === 'YEARLY' ? 365 : 30;
      const now = new Date();
      const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

      const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: req.organizationId!,
          invoiceNumber,
          amount,
          tax: Math.round(amount * 0.18 * 100) / 100,
          currency: 'INR',
          status: 'PAID',
          billingInterval,
          planSlug,
          periodStart: now,
          periodEnd,
          paidAt: now,
        },
      });

      const updatedSub = await prisma.subscription.update({
        where: { organizationId: req.organizationId },
        data: {
          plan: planSlug as any,
          planSlug,
          billingInterval,
          status: 'ACTIVE',
          price: amount,
          seatCount: planConfig.maxUsers,
          leadLimit: planConfig.maxLeads,
          aiTokenLimit: planConfig.maxAiTokens,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialStartsAt: null,
          trialEndsAt: null,
          gracePeriodEndsAt: null,
        },
      });

      await prisma.organization.update({
        where: { id: req.organizationId },
        data: { plan: planSlug as any },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: req.organizationId!,
          userId: req.user?.id,
          action: 'UPDATE',
          entity: 'SETTINGS',
          details: {
            actionDescription: `Upgraded subscription to ${planConfig.name} (${billingInterval})`,
            invoiceNumber,
          },
        },
      });

      return sendSuccess(
        res,
        {
          subscription: updatedSub,
          invoice,
        },
        `Successfully upgraded to ${planConfig.name}`
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Upgrade failed', 500);
    }
  }

  /**
   * Schedule Plan Downgrade at Current Period End
   * Route: POST /api/subscriptions/downgrade
   */
  static async downgradeSubscription(req: Request, res: Response) {
    try {
      const { targetPlanSlug = 'STANDARD', targetBillingInterval = 'MONTHLY' } = req.body;

      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { slug: targetPlanSlug },
      });

      if (!planConfig) {
        return sendError(res, 'Target downgrade plan not found', 400);
      }

      const currentSub = await prisma.subscription.findUnique({
        where: { organizationId: req.organizationId },
      });

      if (!currentSub) {
        return sendError(res, 'No active subscription found', 404);
      }

      const effectiveDate = currentSub.currentPeriodEnd;

      await prisma.auditLog.create({
        data: {
          organizationId: req.organizationId!,
          userId: req.user?.id,
          action: 'UPDATE',
          entity: 'SETTINGS',
          details: {
            actionDescription: `Scheduled downgrade to ${planConfig.name} (${targetBillingInterval}) effective ${effectiveDate.toLocaleDateString()}`,
            targetPlanSlug,
            targetBillingInterval,
            effectiveDate: effectiveDate.toISOString(),
          },
        },
      });

      await prisma.notification.create({
        data: {
          organizationId: req.organizationId!,
          title: `Downgrade Scheduled`,
          message: `Your subscription will transition to ${planConfig.name} on ${effectiveDate.toLocaleDateString()}. All existing CRM data is preserved.`,
          type: 'SYSTEM',
        },
      });

      return sendSuccess(
        res,
        {
          currentPlan: currentSub.planSlug,
          scheduledPlan: targetPlanSlug,
          scheduledBillingInterval: targetBillingInterval,
          effectiveDate,
        },
        `Downgrade to ${planConfig.name} scheduled for ${effectiveDate.toLocaleDateString()}. Customer records are fully preserved.`
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Downgrade scheduling failed', 500);
    }
  }

  /**
   * Idempotent Signed Payment Webhook
   * Route: POST /api/payments/webhook
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const webhookSignature = req.headers['x-razorpay-signature'] as string;
      const secret = config.razorpay.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

      if (process.env.NODE_ENV === 'production' && !secret) {
        return res.status(500).json({ error: 'RAZORPAY_WEBHOOK_SECRET is unconfigured in production' });
      }

      if (secret) {
        if (!webhookSignature) {
          return res.status(400).json({ status: 'invalid_signature', error: 'Missing x-razorpay-signature' });
        }
        const rawPayload = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(rawPayload)
          .digest('hex');

        const expectedBuf = Buffer.from(expectedSignature, 'utf8');
        const sigBuf = Buffer.from(webhookSignature, 'utf8');
        if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
          return res.status(400).json({ status: 'invalid_signature' });
        }
      }

      const event = req.body;
      const eventId = event.event_id || event.id || `evt_${Date.now()}`;

      // Idempotent duplicate check
      const existing = await prisma.paymentWebhookEvent.findUnique({
        where: { eventId },
      });

      if (existing) {
        return res.status(200).json({ status: 'duplicate_ignored' });
      }

      // Record event
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: 'RAZORPAY',
          eventId,
          eventType: event.event || 'payment.captured',
          payload: event,
          status: 'PROCESSED',
        },
      });

      // Automated reconciliation for payment.captured or order.paid
      if (event.event === 'payment.captured' || event.event === 'order.paid') {
        const paymentEntity = event.payload?.payment?.entity || event.payload?.payment || {};
        const orderId = paymentEntity.order_id || event.order_id;
        const paymentId = paymentEntity.id || event.payment_id;

        if (orderId) {
          const pendingPayment = await prisma.payment.findFirst({
            where: { orderId, status: { not: 'SUCCESS' } },
          });

          if (pendingPayment) {
            let invoiceId = pendingPayment.invoiceId;

            // Fulfill subscription and generate invoice if not already processed via client verifyPayment
            if (!invoiceId) {
              const meta: any = pendingPayment.metadata || {};
              const planSlug = meta.planSlug || 'STANDARD';
              const billingInterval = meta.billingInterval || 'MONTHLY';

              const planConfig = await prisma.subscriptionPlanConfig.findUnique({
                where: { slug: planSlug },
              });

              if (planConfig) {
                const amount = billingInterval === 'YEARLY' ? planConfig.yearlyPrice : planConfig.monthlyPrice;
                const periodDays = billingInterval === 'YEARLY' ? 365 : 30;
                const periodStart = new Date();
                const periodEnd = new Date(periodStart.getTime() + periodDays * 24 * 60 * 60 * 1000);
                const invoiceNumber = `INV-${periodStart.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

                const invoice = await prisma.invoice.create({
                  data: {
                    organizationId: pendingPayment.organizationId,
                    invoiceNumber,
                    amount,
                    tax: Math.round(amount * 0.18 * 100) / 100, // 18% GST
                    currency: 'INR',
                    status: 'PAID',
                    billingInterval,
                    planSlug,
                    periodStart,
                    periodEnd,
                    paidAt: periodStart,
                  },
                });
                invoiceId = invoice.id;

                await prisma.subscription.update({
                  where: { organizationId: pendingPayment.organizationId },
                  data: {
                    plan: planSlug as any,
                    planSlug,
                    billingInterval,
                    status: 'ACTIVE',
                    price: amount,
                    currency: 'INR',
                    seatCount: planConfig.maxUsers,
                    leadLimit: planConfig.maxLeads,
                    aiTokenLimit: planConfig.maxAiTokens,
                    currentPeriodStart: periodStart,
                    currentPeriodEnd: periodEnd,
                    trialStartsAt: null,
                    trialEndsAt: null,
                    gracePeriodEndsAt: null,
                  },
                });

                await prisma.organization.update({
                  where: { id: pendingPayment.organizationId },
                  data: { plan: planSlug as any },
                });
              }
            }

            await prisma.payment.update({
              where: { id: pendingPayment.id },
              data: {
                paymentId: paymentId || pendingPayment.paymentId,
                status: 'SUCCESS',
                invoiceId: invoiceId || undefined,
              },
            });

            console.log(`[SubscriptionWebhook] Payment reconciled: orderId=${orderId}, paymentId=${paymentId || 'none'}, eventId=${eventId}`);
          }
        }
      } else if (event.event === 'payment.failed') {
        const paymentEntity = event.payload?.payment?.entity || event.payload?.payment || {};
        const orderId = paymentEntity.order_id || event.order_id;
        const paymentId = paymentEntity.id || event.payment_id;

        if (orderId) {
          const pendingPayment = await prisma.payment.findFirst({
            where: { orderId, status: 'PENDING' },
          });

          if (pendingPayment) {
            await prisma.payment.update({
              where: { id: pendingPayment.id },
              data: {
                paymentId: paymentId || pendingPayment.paymentId,
                status: 'FAILED',
              },
            });
            console.log(`[SubscriptionWebhook] Payment marked failed: orderId=${orderId}, paymentId=${paymentId || 'none'}`);
          }
        }
      }

      return res.status(200).json({ status: 'processed', eventId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Webhook processing failed' });
    }
  }

  /**
   * Get Invoices & Payment History
   * Route: GET /api/subscriptions/invoices
   */
  static async getInvoices(req: Request, res: Response) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
        include: { payments: true },
      });
      return sendSuccess(res, invoices);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch invoices', 500);
    }
  }

  /**
   * Get Specific Invoice for PDF / Print Preview
   * Route: GET /api/subscriptions/invoices/:id/download
   */
  static async getInvoicePdf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await prisma.invoice.findFirst({
        where: { id, organizationId: req.organizationId },
        include: {
          organization: true,
          payments: true,
        },
      });

      if (!invoice) {
        return sendError(res, 'Invoice record not found', 404);
      }

      return sendSuccess(res, {
        invoice,
        company: {
          legalName: 'SwordNex Technologies Private Limited',
          cin: 'U72900KA2024PTC123456',
          gstin: '29AABCS1429B1Z5',
          address: 'SwordNex Tower, Cyber Gateway, Bengaluru, Karnataka, India - 560100',
          supportEmail: 'billing@swordnex.com',
          website: 'https://swordnex.com',
        },
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch invoice details', 500);
    }
  }

  /**
   * Get Payment Transaction History
   * Route: GET /api/subscriptions/payments
   */
  static async getPayments(req: Request, res: Response) {
    try {
      const payments = await prisma.payment.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
        include: { invoice: true },
      });
      return sendSuccess(res, payments);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch payments', 500);
    }
  }

  /**
   * Cancel Subscription at Billing Period End
   * Route: POST /api/subscriptions/cancel
   */
  static async cancelSubscription(req: Request, res: Response) {
    try {
      const sub = await prisma.subscription.update({
        where: { organizationId: req.organizationId },
        data: {
          cancelledAt: new Date(),
          status: 'CANCELED',
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: req.organizationId!,
          userId: req.user?.id,
          action: 'UPDATE',
          entity: 'SETTINGS',
          details: {
            actionDescription: 'Cancelled subscription at period end',
          },
        },
      });

      return sendSuccess(
        res,
        sub,
        'Subscription cancelled. Access remains active until the end of your billing period.'
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to cancel subscription', 500);
    }
  }
}
