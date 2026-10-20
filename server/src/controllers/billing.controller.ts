import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

export class BillingController {
  static async getSubscription(req: Request, res: Response) {
    let subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.organizationId },
    });

    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          organizationId: req.organizationId!,
          plan: 'STANDARD',
          billingInterval: 'MONTHLY',
          status: 'ACTIVE',
          price: 29.0,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          seatCount: 5,
          leadLimit: 15000,
          aiTokenLimit: 500000,
        },
      });
    }

    const [currentLeads, currentMembers, aiUsage] = await Promise.all([
      prisma.lead.count({ where: { organizationId: req.organizationId } }),
      prisma.membership.count({ where: { organizationId: req.organizationId } }),
      prisma.usageRecord.aggregate({
        where: { organizationId: req.organizationId, metric: 'AI_TOKENS' },
        _sum: { quantity: true },
      }),
    ]);

    const availablePlans = [
      {
        plan: 'STANDARD',
        name: 'Standard Plan',
        description: 'Ideal for growing sales teams requiring core CRM and predictive lead scoring.',
        priceMonthly: 29, // $29 / user / month
        priceYearly: 290, // $290 / user / year (~$24.17/user/month - Save 17%)
        billingUnit: 'per user',
        seats: 5,
        leadLimit: 15000,
        aiTokens: 500000,
        features: [
          'Full Lead Management & Quick Convert',
          'Sales Pipeline Kanban Board',
          'Multi-Factor AI Lead Scoring',
          'Customer 360 Contact & Account Profiles',
          'Follow-up Tasks & Reminders',
          'Unified Email Timeline & Composer',
          'Standard Sales Velocity & KPI Reports',
        ],
      },
      {
        plan: 'PREMIUM',
        name: 'Premium AI Suite',
        description: 'For revenue teams demanding autonomous AI sales agents, multi-channel messaging, and visual automations.',
        priceMonthly: 89, // $89 / user / month
        priceYearly: 890, // $890 / user / year (~$74.17/user/month - Save 17%)
        billingUnit: 'per user',
        seats: 25,
        leadLimit: 100000,
        aiTokens: 5000000,
        features: [
          'Everything in Standard Plan',
          'Autonomous Sales Agents (Lead Research, Follow-ups)',
          'Human-in-the-Loop Agent Approval Queue',
          'AI Deal Health & Stalled Opportunity Diagnosis',
          'Visual Automation Workflow Builder (Trigger → Action)',
          'Multi-channel WhatsApp Business & Twilio SMS Hub',
          'AI Sales Email Drafter & Meeting Summarizer',
          'Predictive Revenue Forecasting & Token Metering',
          'Custom Roles & Cryptographic Security Audit Trail',
        ],
      },
    ];

    return sendSuccess(res, {
      subscription,
      usage: {
        leadsUsed: currentLeads,
        leadLimit: subscription.leadLimit,
        seatsUsed: currentMembers,
        seatLimit: subscription.seatCount,
        aiTokensUsed: aiUsage._sum.quantity || subscription.aiTokensUsed,
        aiTokenLimit: subscription.aiTokenLimit,
      },
      plans: availablePlans,
    });
  }

  static async changePlan(req: Request, res: Response) {
    const { plan, billingInterval = 'MONTHLY' } = req.body;

    if (!['STANDARD', 'PREMIUM'].includes(plan)) {
      return sendError(res, 'Invalid subscription plan. Allowed plans: STANDARD, PREMIUM', 400);
    }

    if (!['MONTHLY', 'YEARLY'].includes(billingInterval)) {
      return sendError(res, 'Invalid billing interval. Allowed: MONTHLY, YEARLY', 400);
    }

    const planSpecs = {
      STANDARD: {
        seatCount: 5,
        leadLimit: 15000,
        aiTokenLimit: 500000,
        price: billingInterval === 'YEARLY' ? 290.0 : 29.0,
      },
      PREMIUM: {
        seatCount: 25,
        leadLimit: 100000,
        aiTokenLimit: 5000000,
        price: billingInterval === 'YEARLY' ? 890.0 : 89.0,
      },
    }[plan as 'STANDARD' | 'PREMIUM'];

    const periodDays = billingInterval === 'YEARLY' ? 365 : 30;

    const [updatedSub] = await Promise.all([
      prisma.subscription.update({
        where: { organizationId: req.organizationId },
        data: {
          plan,
          billingInterval,
          price: planSpecs.price,
          seatCount: planSpecs.seatCount,
          leadLimit: planSpecs.leadLimit,
          aiTokenLimit: planSpecs.aiTokenLimit,
          currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
      }),
      prisma.organization.update({
        where: { id: req.organizationId },
        data: { plan },
      }),
    ]);

    return sendSuccess(
      res,
      updatedSub,
      `Successfully switched to ${plan} Plan billed ${billingInterval.toLowerCase()} ($${planSpecs.price}/${billingInterval === 'YEARLY' ? 'year' : 'month'})`
    );
  }
}
