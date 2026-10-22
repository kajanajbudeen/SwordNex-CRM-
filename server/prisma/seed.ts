import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_SEED) {
    console.error('⛔ Refusing to seed database in production environment without explicit ALLOW_PRODUCTION_SEED=true flag.');
    process.exit(1);
  }

  console.log('🌱 Starting SwordNex AI CRM database seeding...');

  // Clean existing data for clean seed
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.paymentWebhookEvent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.usageRecord.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.workflowRun.deleteMany({});
  await prisma.automationWorkflow.deleteMany({});
  await prisma.aiInsight.deleteMany({});
  await prisma.aiAgentRun.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.pipelineStage.deleteMany({});
  await prisma.pipeline.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.integration.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.subscriptionPlanConfig.deleteMany({});

  // 1. Seed Dynamic Subscription Plan Configurations (INR Pricing)
  console.log('📦 Seeding dynamic SaaS Subscription Plans...');
  await prisma.subscriptionPlanConfig.createMany({
    data: [
      {
        slug: 'FREE_TRIAL',
        name: '15-Day Free Trial',
        description: 'Instant full access to core CRM features, lead scoring, and pipeline tools. Zero credit card required.',
        monthlyPrice: 0.0,
        yearlyPrice: 0.0,
        currency: 'INR',
        maxUsers: 5,
        maxCustomRoles: 5,
        maxStorageMb: 1000,
        maxLeads: 15000,
        maxAiTokens: 500000,
        allowedModules: ['LEADS', 'CONTACTS', 'COMPANIES', 'DEALS', 'TASKS', 'REPORTS'],
        aiFeaturesEnabled: true,
        reportExportEnabled: true,
        apiAccessEnabled: false,
        supportLevel: 'STANDARD',
        trialDays: 15,
        gracePeriodDays: 3,
        isActive: true,
      },
      {
        slug: 'STANDARD',
        name: 'Standard Plan',
        description: 'Ideal for growing sales teams requiring core CRM, predictive AI scoring, and team collaboration.',
        monthlyPrice: 2499.0, // ₹2,499 / month
        yearlyPrice: 24990.0, // ₹24,990 / year (~17% discount)
        currency: 'INR',
        maxUsers: 10,
        maxCustomRoles: 10,
        maxStorageMb: 5000,
        maxLeads: 25000,
        maxAiTokens: 1000000,
        allowedModules: ['LEADS', 'CONTACTS', 'COMPANIES', 'DEALS', 'TASKS', 'REPORTS', 'COMMS', 'WORKFLOWS'],
        aiFeaturesEnabled: true,
        reportExportEnabled: true,
        apiAccessEnabled: true,
        supportLevel: 'PRIORITY',
        trialDays: 15,
        gracePeriodDays: 5,
        isActive: true,
      },
      {
        slug: 'PREMIUM',
        name: 'Premium AI Suite',
        description: 'For revenue teams demanding autonomous AI sales agents, WhatsApp/SMS hubs, unlimited visual automations, and custom RBAC.',
        monthlyPrice: 7499.0, // ₹7,499 / month
        yearlyPrice: 74990.0, // ₹74,990 / year (~17% discount)
        currency: 'INR',
        maxUsers: 50,
        maxCustomRoles: 999,
        maxStorageMb: 25000,
        maxLeads: 100000,
        maxAiTokens: 5000000,
        allowedModules: ['LEADS', 'CONTACTS', 'COMPANIES', 'DEALS', 'TASKS', 'REPORTS', 'COMMS', 'WORKFLOWS', 'AI_CENTER', 'INTEGRATIONS', 'SETTINGS', 'BILLING'],
        aiFeaturesEnabled: true,
        reportExportEnabled: true,
        apiAccessEnabled: true,
        supportLevel: 'DEDICATED',
        trialDays: 15,
        gracePeriodDays: 7,
        isActive: true,
      },
    ],
  });

  const passwordHash = await bcrypt.hash('SwordNex2026!', 10);

  // 2. Create Primary Organization: SwordNex Technologies Global
  const org = await prisma.organization.create({
    data: {
      name: 'SwordNex Technologies Global',
      slug: 'swordnex-global',
      domain: 'swordnex.com',
      plan: 'PREMIUM',
      status: 'ACTIVE',
      isActive: true,
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        aiAutoScoring: true,
      },
    },
  });

  console.log('✅ Created Organization:', org.name);

  // 3. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@swordnex.com',
      passwordHash,
      firstName: 'Kaja',
      lastName: 'Najbudeen',
      globalRole: 'SUPER_ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const kajaUser = await prisma.user.create({
    data: {
      email: 'kaja@swordnex.com',
      passwordHash,
      firstName: 'Kaja',
      lastName: 'Najbudeen',
      globalRole: 'SUPER_ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'aneee@swordnex.com',
      passwordHash,
      firstName: 'Aneee',
      lastName: '',
      globalRole: 'ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const managerUserAlias = await prisma.user.create({
    data: {
      email: 'sarah.lead@swordnex.com',
      passwordHash,
      firstName: 'Aneee',
      lastName: '',
      globalRole: 'ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const repUser = await prisma.user.create({
    data: {
      email: 'venkat@swordnex.com',
      passwordHash,
      firstName: 'Venkat',
      lastName: '',
      globalRole: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const repUserAlias = await prisma.user.create({
    data: {
      email: 'alex.rep@swordnex.com',
      passwordHash,
      firstName: 'Venkat',
      lastName: '',
      globalRole: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  // 4. Create Custom Roles for Organization
  console.log('🛡️ Seeding Custom Dynamic Roles and Permissions...');
  const salesExecRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: 'Sales Executive',
      description: 'Handles outbound prospecting, deal progression, and client follow-ups.',
      isSystem: false,
      department: 'SALES',
      permissions: {
        create: [
          { module: 'LEADS', action: 'VIEW' },
          { module: 'LEADS', action: 'CREATE' },
          { module: 'LEADS', action: 'EDIT' },
          { module: 'LEADS', action: 'EXPORT' },
          { module: 'DEALS', action: 'VIEW' },
          { module: 'DEALS', action: 'CREATE' },
          { module: 'DEALS', action: 'EDIT' },
          { module: 'CONTACTS', action: 'VIEW' },
          { module: 'CONTACTS', action: 'CREATE' },
          { module: 'CONTACTS', action: 'EDIT' },
          { module: 'TASKS', action: 'VIEW' },
          { module: 'TASKS', action: 'CREATE' },
          { module: 'TASKS', action: 'EDIT' },
          { module: 'COMMS', action: 'VIEW' },
          { module: 'COMMS', action: 'CREATE' },
        ],
      },
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: 'Manager',
      description: 'Oversees team pipeline velocity, approves deal proposals, and reviews reports.',
      isSystem: false,
      department: 'MANAGEMENT',
      permissions: {
        create: [
          { module: 'LEADS', action: 'MANAGE' },
          { module: 'DEALS', action: 'MANAGE' },
          { module: 'DEALS', action: 'APPROVE' },
          { module: 'CONTACTS', action: 'MANAGE' },
          { module: 'COMPANIES', action: 'MANAGE' },
          { module: 'TASKS', action: 'MANAGE' },
          { module: 'TASKS', action: 'ASSIGN' },
          { module: 'EMPLOYEES', action: 'VIEW' },
          { module: 'REPORTS', action: 'VIEW' },
          { module: 'REPORTS', action: 'EXPORT' },
          { module: 'AI_CENTER', action: 'VIEW' },
          { module: 'AI_CENTER', action: 'APPROVE' },
        ],
      },
    },
  });

  const supportRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: 'Customer Support',
      description: 'Responds to customer tickets and logs communication timeline records.',
      isSystem: false,
      department: 'SUPPORT',
      permissions: {
        create: [
          { module: 'CONTACTS', action: 'VIEW' },
          { module: 'COMPANIES', action: 'VIEW' },
          { module: 'TASKS', action: 'VIEW' },
          { module: 'TASKS', action: 'CREATE' },
          { module: 'TASKS', action: 'EDIT' },
          { module: 'COMMS', action: 'VIEW' },
          { module: 'COMMS', action: 'CREATE' },
        ],
      },
    },
  });

  // 5. Create Memberships
  await prisma.membership.createMany({
    data: [
      { organizationId: org.id, userId: adminUser.id, role: 'ADMIN', title: 'VP of Global Operations' },
      { organizationId: org.id, userId: kajaUser.id, role: 'ADMIN', title: 'VP of Global Operations' },
      { organizationId: org.id, userId: managerUser.id, role: 'ADMIN', customRoleId: managerRole.id, title: 'Director of Enterprise Sales' },
      { organizationId: org.id, userId: managerUserAlias.id, role: 'ADMIN', customRoleId: managerRole.id, title: 'Director of Enterprise Sales' },
      { organizationId: org.id, userId: repUser.id, role: 'USER', customRoleId: salesExecRole.id, title: 'Senior Account Executive' },
      { organizationId: org.id, userId: repUserAlias.id, role: 'USER', customRoleId: salesExecRole.id, title: 'Senior Account Executive' },
    ],
  });

  // 6. Create Premium Subscription with INR Pricing, Invoices, and Payments
  const sub = await prisma.subscription.create({
    data: {
      organizationId: org.id,
      plan: 'PREMIUM',
      planSlug: 'PREMIUM',
      billingInterval: 'YEARLY',
      status: 'ACTIVE',
      currency: 'INR',
      price: 74990.0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      seatCount: 50,
      leadLimit: 100000,
      aiTokenLimit: 5000000,
      aiTokensUsed: 142050,
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      subscriptionId: sub.id,
      invoiceNumber: 'INV-2026-001',
      amount: 74990.0,
      tax: 13498.2, // 18% GST in India
      currency: 'INR',
      status: 'PAID',
      billingInterval: 'YEARLY',
      planSlug: 'PREMIUM',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      paidAt: new Date(),
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org.id,
      subscriptionId: sub.id,
      amount: 74990.0,
      currency: 'INR',
      provider: 'RAZORPAY',
      orderId: 'order_SNX982741982',
      paymentId: 'pay_SNX982741982',
      signature: 'sig_mock_signature_verified',
      status: 'SUCCESS',
      invoiceId: invoice.id,
    },
  });

  // 7. Seed Demonstration Free Trial Organization
  console.log('⚡ Seeding Free Trial demonstration company...');
  const trialOrg = await prisma.organization.create({
    data: {
      name: 'Nexus Innovations Pvt Ltd',
      slug: 'nexus-innovations',
      domain: 'nexusinnovations.in',
      plan: 'FREE_TRIAL',
      status: 'ACTIVE',
      isActive: true,
      settings: { currency: 'INR', timezone: 'Asia/Kolkata' },
    },
  });

  const trialAdmin = await prisma.user.create({
    data: {
      email: 'rahul.nexus@example.com',
      passwordHash,
      firstName: 'Rahul',
      lastName: 'Sharma',
      globalRole: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: trialOrg.id,
      userId: trialAdmin.id,
      role: 'ADMIN',
      title: 'Founder & CEO',
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: trialOrg.id,
      plan: 'FREE_TRIAL',
      planSlug: 'FREE_TRIAL',
      billingInterval: 'MONTHLY',
      status: 'TRIALING',
      currency: 'INR',
      price: 0.0,
      currentPeriodStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Started 3 days ago
      currentPeriodEnd: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),  // 12 days left
      trialStartsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      gracePeriodEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      seatCount: 5,
      leadLimit: 15000,
      aiTokenLimit: 500000,
      aiTokensUsed: 12400,
    },
  });

  // 8. Seed Suspended Organization (Demonstrating Super Admin controls)
  const suspendedOrg = await prisma.organization.create({
    data: {
      name: 'Starlight Digital Media',
      slug: 'starlight-media',
      domain: 'starlightmedia.co',
      plan: 'STANDARD',
      status: 'SUSPENDED',
      suspendedReason: 'Account past due 30 days. Contact billing support.',
      isActive: false,
      settings: { currency: 'INR', timezone: 'Asia/Kolkata' },
    },
  });

  const suspendedAdmin = await prisma.user.create({
    data: {
      email: 'kavita.media@example.com',
      passwordHash,
      firstName: 'Kavita',
      lastName: 'Nair',
      globalRole: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: suspendedOrg.id,
      userId: suspendedAdmin.id,
      role: 'ADMIN',
      title: 'Managing Director',
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: suspendedOrg.id,
      plan: 'STANDARD',
      planSlug: 'STANDARD',
      billingInterval: 'MONTHLY',
      status: 'SUSPENDED',
      currency: 'INR',
      price: 2499.0,
      currentPeriodStart: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      seatCount: 10,
      leadLimit: 25000,
      aiTokenLimit: 1000000,
      aiTokensUsed: 980000,
    },
  });

  // 5. Create Pipeline and Stages
  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId: org.id,
      name: 'Enterprise B2B Software Pipeline',
      isDefault: true,
    },
  });

  const stageDefinitions = [
    { name: 'New Inbound', order: 1, winProbability: 10, color: '#64748B' },
    { name: 'Qualified', order: 2, winProbability: 25, color: '#0284C7' },
    { name: 'Discovery & Demo', order: 3, winProbability: 45, color: '#8B5CF6' },
    { name: 'Proposal Sent', order: 4, winProbability: 65, color: '#D946EF' },
    { name: 'Commercial Negotiation', order: 5, winProbability: 85, color: '#F59E0B' },
    { name: 'Closed Won', order: 6, winProbability: 100, color: '#10B981' },
    { name: 'Closed Lost', order: 7, winProbability: 0, color: '#EF4444' },
  ];

  const stages: Record<string, string> = {};
  for (const s of stageDefinitions) {
    const createdStage = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: s.name,
        order: s.order,
        winProbability: s.winProbability,
        color: s.color,
      },
    });
    stages[s.name] = createdStage.id;
  }

  // 6. Create Companies
  const cloudScale = await prisma.company.create({
    data: {
      organizationId: org.id,
      name: 'CloudScale Technologies',
      domain: 'cloudscale.io',
      industry: 'Cloud Infrastructure',
      size: '250-500 employees',
      city: 'San Francisco',
      country: 'USA',
      annualRevenue: 42000000,
      healthScore: 92,
      churnRisk: 'LOW',
    },
  });

  const apexLogistics = await prisma.company.create({
    data: {
      organizationId: org.id,
      name: 'Apex Global Logistics',
      domain: 'apexlogistics.com',
      industry: 'Supply Chain',
      size: '1000+ employees',
      city: 'Chicago',
      country: 'USA',
      annualRevenue: 180000000,
      healthScore: 68,
      churnRisk: 'MEDIUM',
    },
  });

  const novaFintech = await prisma.company.create({
    data: {
      organizationId: org.id,
      name: 'Nova Fintech Solutions',
      domain: 'novafin.co',
      industry: 'Financial Technology',
      size: '100-250 employees',
      city: 'London',
      country: 'UK',
      annualRevenue: 28000000,
      healthScore: 84,
      churnRisk: 'LOW',
    },
  });

  // 7. Create Contacts
  const contactMarcus = await prisma.contact.create({
    data: {
      organizationId: org.id,
      companyId: apexLogistics.id,
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'm.vance@apexlogistics.com',
      phone: '+1 312 555 0192',
      title: 'Chief Operating Officer',
      department: 'Executive Operations',
      lifecycleStage: 'CUSTOMER',
      ownerId: repUser.id,
    },
  });

  const contactElena = await prisma.contact.create({
    data: {
      organizationId: org.id,
      companyId: cloudScale.id,
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena@cloudscale.io',
      phone: '+1 415 555 8391',
      title: 'VP of Commercial Strategy',
      department: 'Revenue & Operations',
      lifecycleStage: 'SQL',
      ownerId: repUser.id,
    },
  });

  // 8. Create Leads with explainable AI scores
  const lead1 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      firstName: 'Devon',
      lastName: 'Sterling',
      email: 'devon.sterling@acme-enterprises.org',
      phone: '+1 617 555 0124',
      company: 'Acme Global Enterprises',
      title: 'Chief Information Officer',
      status: 'QUALIFIED',
      priority: 'HIGH',
      source: 'REFERRAL',
      score: 94,
      scoreExplanation: 'Tier 1 Priority Lead: Senior Executive role (@CIO) with verified corporate domain and referral source.',
      scoreConfidence: 0.95,
      ownerId: repUser.id,
      tags: ['Enterprise', 'High-Intent', 'Q4 Budget'],
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      firstName: 'Sophia',
      lastName: 'Chen',
      email: 'sophia.c@biovision-health.com',
      phone: '+1 206 555 9410',
      company: 'BioVision Healthcare',
      title: 'Director of Business Applications',
      status: 'NEW',
      priority: 'HIGH',
      source: 'WEBSITE',
      score: 86,
      scoreExplanation: 'High buying intent with direct inquiry regarding CRM workflow automation.',
      scoreConfidence: 0.91,
      ownerId: repUser.id,
      tags: ['Healthcare', 'Inbound Demo'],
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      firstName: 'Liam',
      lastName: 'Gallagher',
      email: 'liam@gallagher-design.co.uk',
      phone: '+44 20 7946 0912',
      company: 'Gallagher Creative Labs',
      title: 'Managing Director',
      status: 'CONTACTED',
      priority: 'MEDIUM',
      source: 'LINKEDIN',
      score: 68,
      scoreExplanation: 'Mid-sized agency executive evaluating multi-channel client messaging.',
      scoreConfidence: 0.88,
      ownerId: managerUser.id,
      tags: ['EMEA', 'Design Tech'],
    },
  });

  // 9. Create Deals across stages
  const deal1 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      pipelineId: pipeline.id,
      stageId: stages['Commercial Negotiation'],
      title: 'CloudScale Global CRM Migration & AI Rollout',
      amount: 145000,
      currency: 'USD',
      probability: 85,
      healthScore: 90,
      healthSummary: 'Executive sponsor confirmed procurement review. Contract redlines in progress.',
      companyId: cloudScale.id,
      contactId: contactElena.id,
      ownerId: repUser.id,
      expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      tags: ['Enterprise', 'Multi-Year'],
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      pipelineId: pipeline.id,
      stageId: stages['Proposal Sent'],
      title: 'Apex Logistics Automated Dispatch & Communication Hub',
      amount: 98000,
      currency: 'USD',
      probability: 65,
      healthScore: 72,
      healthSummary: 'Proposal submitted. Follow-up meeting scheduled with COO Marcus Vance.',
      companyId: apexLogistics.id,
      contactId: contactMarcus.id,
      ownerId: repUser.id,
      expectedCloseDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      tags: ['Logistics', 'WhatsApp Hub'],
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      pipelineId: pipeline.id,
      stageId: stages['Discovery & Demo'],
      title: 'Nova Fintech Risk & Lead Scoring Engine Integration',
      amount: 62000,
      currency: 'USD',
      probability: 45,
      healthScore: 82,
      companyId: novaFintech.id,
      ownerId: managerUser.id,
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      tags: ['Fintech', 'API Integration'],
    },
  });

  const deal4 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      pipelineId: pipeline.id,
      stageId: stages['Closed Won'],
      title: 'Beacon Media Digital Transformation Suite',
      amount: 85000,
      currency: 'USD',
      status: 'WON',
      probability: 100,
      healthScore: 98,
      ownerId: repUser.id,
      actualCloseDate: new Date(),
    },
  });

  // 10. Create Tasks
  await prisma.task.createMany({
    data: [
      {
        organizationId: org.id,
        title: 'Send Revised Commercial Proposal & SLA Addendum',
        description: 'Update Section 4 with dedicated AI throughput commitments for Elena Rostova',
        priority: 'URGENT',
        status: 'PENDING',
        category: 'PREPARATION',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        assignedToId: repUser.id,
        dealId: deal1.id,
        contactId: contactElena.id,
      },
      {
        organizationId: org.id,
        title: 'Follow Up: Marcus Vance Logistics Architecture Review',
        description: 'Verify WhatsApp Business sender ID verification documents with IT team',
        priority: 'HIGH',
        status: 'PENDING',
        category: 'CALL',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue task demonstration
        assignedToId: repUser.id,
        dealId: deal2.id,
        contactId: contactMarcus.id,
        aiSuggested: true,
      },
      {
        organizationId: org.id,
        title: 'Conduct In-Depth Discovery Call with Devon Sterling (CIO)',
        description: 'High-scoring referral lead (Score: 94) interested in enterprise multi-tenancy',
        priority: 'HIGH',
        status: 'PENDING',
        category: 'CALL',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assignedToId: repUser.id,
        leadId: lead1.id,
        aiSuggested: true,
      },
    ],
  });

  // 11. Create Activities
  await prisma.activity.createMany({
    data: [
      {
        organizationId: org.id,
        type: 'CALL',
        title: 'Discovery Video Call with Elena Rostova',
        description: 'Reviewed CloudScale current stack, confirmed requirement for custom automated sales triggers.',
        dealId: deal1.id,
        contactId: contactElena.id,
        createdById: repUser.id,
      },
      {
        organizationId: org.id,
        type: 'AI_INSIGHT',
        title: 'AI Lead Scored: 94/100',
        description: 'Devon Sterling classified as Tier 1 Priority buyer based on CIO title and corporate domain.',
        leadId: lead1.id,
        createdById: adminUser.id,
      },
      {
        organizationId: org.id,
        type: 'STAGE_CHANGE',
        title: 'Stage moved to Commercial Negotiation',
        description: 'CloudScale deal progressed from Proposal Sent to Commercial Negotiation.',
        dealId: deal1.id,
        createdById: repUser.id,
      },
    ],
  });

  // 12. Create Automation Workflows
  await prisma.automationWorkflow.create({
    data: {
      organizationId: org.id,
      name: 'High-Score Inbound Lead Auto-Routing & Task Creation',
      description: 'When a new lead arrives with score >= 80, create an urgent discovery task and notify account executive',
      triggerType: 'LEAD_CREATED',
      conditions: [{ field: 'score', operator: 'GREATER_THAN', value: 75 }],
      actions: [
        { type: 'CREATE_TASK', params: { title: 'Urgent: Follow up on Tier 1 Inbound Lead', priority: 'URGENT' } },
        { type: 'ADD_ACTIVITY_NOTE', params: { title: 'Automated Routing Initiated' } },
      ],
      isActive: true,
      runCount: 14,
    },
  });

  // 13. Create Integrations
  await prisma.integration.createMany({
    data: [
      {
        organizationId: org.id,
        provider: 'EMAIL_SMTP',
        name: 'Corporate Email (SMTP/IMAP)',
        isEnabled: true,
        status: 'HEALTHY',
        config: { host: 'mail.swordnex.com', port: 587, user: 'sales@swordnex.com' },
      },
      {
        organizationId: org.id,
        provider: 'WHATSAPP',
        name: 'WhatsApp Business API',
        isEnabled: false,
        status: 'DISCONNECTED',
      },
      {
        organizationId: org.id,
        provider: 'TWILIO_SMS',
        name: 'Twilio SMS Gateway',
        isEnabled: false,
        status: 'DISCONNECTED',
      },
      {
        organizationId: org.id,
        provider: 'WEBHOOK',
        name: 'Website Lead Inbound Webhook',
        isEnabled: true,
        status: 'HEALTHY',
        config: { endpoint: '/api/v1/webhooks/leads' },
      },
    ],
  });

  // 14. Create Conversations & Messages
  const convo = await prisma.conversation.create({
    data: {
      organizationId: org.id,
      channel: 'EMAIL',
      subject: 'Discussion on SwordNex CRM Rollout Timeline',
      contactId: contactElena.id,
      assignedToId: repUser.id,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: convo.id,
        senderType: 'CUSTOMER',
        body: 'Hi Venkat, we reviewed the initial proposal with our executive committee. When can we review security compliance?',
        status: 'READ',
      },
      {
        conversationId: convo.id,
        senderType: 'AGENT',
        senderId: repUser.id,
        body: 'Hi Elena, wonderful to hear! I can organize an architecture deep-dive with our Head of Security tomorrow at 2 PM PST.',
        status: 'DELIVERED',
      },
    ],
  });

  console.log('🎉 SwordNex AI CRM database seeded successfully!');
  console.log('🔑 Demo Login: admin@swordnex.com | Password: SwordNex2026!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
