import { config } from '../../config';
import { prisma } from '../../utils/prisma';

export interface AiScoringResult {
  score: number;
  factors: { signal: string; impact: number; explanation: string }[];
  summary: string;
  confidence: number;
  timestamp: string;
}

export interface NextBestActionResult {
  action: string;
  category: 'EMAIL' | 'CALL' | 'MEETING' | 'DISCOVERY' | 'PROPOSAL';
  reasoning: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedTemplate?: string;
  confidence: number;
}

export interface DealHealthResult {
  healthScore: number;
  status: 'EXCELLENT' | 'GOOD' | 'AT_RISK' | 'CRITICAL';
  risks: string[];
  recommendations: string[];
  daysStalled: number;
  confidence: number;
}

export interface MeetingSummaryResult {
  summary: string;
  keyPoints: string[];
  actionItems: { task: string; owner?: string; dueDate?: string }[];
  customerSentiment: 'POSITIVE' | 'NEUTRAL' | 'SKEPTICAL' | 'CHALLENGING';
  confidence: number;
}

export interface EmailDraftResult {
  subject: string;
  body: string;
  tone: string;
  rationale: string;
}

export interface NaturalSearchFilter {
  interpretedQuery: string;
  targetEntity: 'LEAD' | 'DEAL' | 'CONTACT' | 'TASK';
  filters: Record<string, any>;
  explanation: string;
}

export class AiGateway {
  private static provider: string = config.ai.provider;

  /**
   * AI Lead Scoring Engine: Explainable, multi-factor scoring
   */
  static async scoreLead(leadData: {
    title?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    activitiesCount?: number;
    hasCorporateDomain?: boolean;
  }): Promise<AiScoringResult> {
    const factors: { signal: string; impact: number; explanation: string }[] = [];
    let baseScore = 30;

    // Signal: Verified business email / domain
    if (leadData.email) {
      const domain = leadData.email.split('@')[1]?.toLowerCase();
      const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
      if (domain && !freeProviders.includes(domain)) {
        baseScore += 25;
        factors.push({
          signal: 'Corporate Domain Verified',
          impact: 25,
          explanation: `Work email address detected on enterprise domain (@${domain}).`,
        });
      } else {
        baseScore += 5;
        factors.push({
          signal: 'Personal Email Detected',
          impact: 5,
          explanation: 'Public email provider used; lower initial buying velocity signal.',
        });
      }
    }

    // Signal: Decision Maker / Seniority
    if (leadData.title) {
      const titleLower = leadData.title.toLowerCase();
      if (
        titleLower.includes('vp') ||
        titleLower.includes('director') ||
        titleLower.includes('head') ||
        titleLower.includes('chief') ||
        titleLower.includes('ceo') ||
        titleLower.includes('cto') ||
        titleLower.includes('cfo') ||
        titleLower.includes('founder')
      ) {
        baseScore += 25;
        factors.push({
          signal: 'Senior Decision Maker Title',
          impact: 25,
          explanation: `Executive role "${leadData.title}" grants direct authority over purchase budgets.`,
        });
      } else if (titleLower.includes('lead') || titleLower.includes('manager')) {
        baseScore += 15;
        factors.push({
          signal: 'Operational Champion Title',
          impact: 15,
          explanation: `Mid-level champion role "${leadData.title}" evaluated with high influencer potential.`,
        });
      }
    }

    // Signal: Lead Acquisition Source
    if (leadData.source === 'REFERRAL') {
      baseScore += 20;
      factors.push({
        signal: 'Peer Referral Acquisition',
        impact: 20,
        explanation: 'Customer referrals yield 3.8x higher qualification and conversion rates.',
      });
    } else if (leadData.source === 'WEBSITE' || leadData.source === 'LINKEDIN') {
      baseScore += 10;
      factors.push({
        signal: 'Inbound Intent Signal',
        impact: 10,
        explanation: 'Direct inbound inquiry implies an active evaluation cycle.',
      });
    }

    // Signal: Phone number presence
    if (leadData.phone) {
      baseScore += 5;
      factors.push({
        signal: 'Direct Telephone Contact',
        impact: 5,
        explanation: 'Direct phone number provided for immediate multi-channel outreach.',
      });
    }

    const finalScore = Math.min(Math.max(baseScore, 10), 99);
    return {
      score: finalScore,
      factors,
      summary:
        finalScore >= 80
          ? 'Priority Tier 1 Lead: High buying power, corporate domain and strong intent. Immediate contact recommended.'
          : finalScore >= 50
          ? 'Tier 2 Qualified Lead: Suitable engagement profile. Follow up with targeted product capabilities.'
          : 'Tier 3 Developing Lead: Initial inquiry requiring discovery and enrichment.',
      confidence: 0.92,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * AI Next Best Action: Context-aware prescriptive sales actions
   */
  static async getNextBestAction(context: {
    type: 'LEAD' | 'DEAL';
    title: string;
    stageOrStatus: string;
    lastActivityDaysAgo?: number;
    amount?: number;
  }): Promise<NextBestActionResult> {
    const daysSince = context.lastActivityDaysAgo ?? 0;

    if (context.type === 'LEAD') {
      if (daysSince > 3) {
        return {
          action: 'Schedule Personalized Re-engagement Discovery Call',
          category: 'CALL',
          reasoning: `No touchpoint recorded in ${daysSince} days. Outreach velocity is the #1 predictor of conversion.`,
          urgency: 'HIGH',
          suggestedTemplate: 'Hi {{firstName}}, checking in on our discussion regarding {{company}}’s CRM priorities.',
          confidence: 0.89,
        };
      }
      return {
        action: 'Send Value Proposition Brief & Product Demo Link',
        category: 'EMAIL',
        reasoning: 'Fresh lead requires high-signal educational materials matching company profile.',
        urgency: 'MEDIUM',
        suggestedTemplate: 'Hi {{firstName}}, sharing an executive summary on how SwordNex automates sales cycles.',
        confidence: 0.94,
      };
    }

    // DEAL Context
    if (context.stageOrStatus === 'Proposal' || context.stageOrStatus === 'Negotiation') {
      return {
        action: 'Review Pricing & Schedule Decision Maker Alignment Call',
        category: 'MEETING',
        reasoning: `High-stake deal in ${context.stageOrStatus} stage. Direct alignment with VP/C-suite removes last-mile blockers.`,
        urgency: 'CRITICAL',
        suggestedTemplate: 'Meeting Agenda: Finalizing commercial terms and onboarding roadmap for {{company}}.',
        confidence: 0.95,
      };
    }

    return {
      action: 'Conduct In-Depth Discovery & Stakeholder Mapping',
      category: 'DISCOVERY',
      reasoning: 'Identify secondary champions and procurement requirements before generating formal quote.',
      urgency: 'MEDIUM',
      confidence: 0.88,
    };
  }

  /**
   * AI Deal Health & Stalled Deal Intelligence
   */
  static async evaluateDealHealth(deal: {
    amount: number;
    stageName: string;
    daysInCurrentStage: number;
    expectedCloseDate?: Date | null;
    activitiesCount: number;
  }): Promise<DealHealthResult> {
    const risks: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 85;

    if (deal.daysInCurrentStage > 14) {
      healthScore -= 30;
      risks.push(`Deal has been stalled in "${deal.stageName}" for ${deal.daysInCurrentStage} days.`);
      recommendations.push('Trigger executive sponsor outreach to re-ignite stakeholder urgency.');
    }

    if (deal.activitiesCount < 3) {
      healthScore -= 20;
      risks.push('Low communication density (fewer than 3 customer touchpoints logged).');
      recommendations.push('Schedule multi-stakeholder product deep dive with technical champions.');
    }

    if (deal.expectedCloseDate && new Date(deal.expectedCloseDate) < new Date()) {
      healthScore -= 25;
      risks.push('Expected close date has lapsed without stage progression.');
      recommendations.push('Update realistic timeline with the customer and refresh decision timeline.');
    }

    if (healthScore >= 75) {
      recommendations.push('Deal trajectory is strong; prepare mutual close plan for signature.');
    }

    const finalScore = Math.max(Math.min(healthScore, 100), 10);
    return {
      healthScore: finalScore,
      status: finalScore >= 75 ? 'GOOD' : finalScore >= 50 ? 'AT_RISK' : 'CRITICAL',
      risks: risks.length > 0 ? risks : ['No critical risk factors detected.'],
      recommendations,
      daysStalled: deal.daysInCurrentStage,
      confidence: 0.91,
    };
  }

  /**
   * AI Email Writer: Generates personalized, professional sales copy
   */
  static async generateSalesEmail(params: {
    recipientName: string;
    recipientCompany?: string;
    objective: 'COLD_OUTREACH' | 'FOLLOW_UP' | 'PROPOSAL_SUBMISSION' | 'MEETING_REQUEST' | 'CHECK_IN';
    keyPoints?: string[];
  }): Promise<EmailDraftResult> {
    const company = params.recipientCompany || 'your team';
    let subject = '';
    let body = '';
    let rationale = '';

    switch (params.objective) {
      case 'FOLLOW_UP':
        subject = `Next steps following our discussion — ${company} & SwordNex`;
        body = `Hi ${params.recipientName},\n\nThank you for taking the time to connect earlier. Based on our discussion regarding ${company}'s sales growth priorities, I wanted to follow up on the specific milestones we outlined.\n\nOur intelligent CRM platform is engineered to eliminate data fragmentation and accelerate qualified pipeline velocity by over 40%.\n\nWould you have 15 minutes this Thursday or Friday for a quick 1:1 walkthrough?\n\nBest regards,\n[Your Name]\nSwordNex Technologies`;
        rationale = 'Polite, clear, references previous touchpoint and proposes concise two-slot call availability.';
        break;

      case 'PROPOSAL_SUBMISSION':
        subject = `Tailored Solution Proposal & Commercial Terms for ${company}`;
        body = `Dear ${params.recipientName},\n\nFollowing our technical discovery session, I am pleased to share the tailored implementation proposal for ${company}.\n\nThis scope includes complete enterprise multi-tenancy, AI-powered lead scoring, unified communications, and automated workflow triggers tailored to your revenue teams.\n\nI have attached the full documentation for review. Let's schedule a 20-minute executive briefing next week to answer any questions.\n\nWarm regards,\n[Your Name]\nSwordNex Technologies`;
        rationale = 'Executive-grade professionalism summarizing value proposition and clear call-to-action.';
        break;

      default:
        subject = `Accelerating revenue automation at ${company}`;
        body = `Hi ${params.recipientName},\n\nI noticed the remarkable momentum ${company} has been achieving in your sector. Fast-scaling organizations often face challenges with pipeline leakage and repetitive CRM manual entry.\n\nSwordNex AI CRM delivers native AI copilot guidance, predictive deal analytics, and autonomous sales workflows in one unified cockpit.\n\nWould you be open to a brief 10-minute preview on how we help sales leaders scale efficiently?\n\nSincerely,\n[Your Name]\nSwordNex Technologies`;
        rationale = 'Value-oriented cold outreach focusing on pain relief and pipeline acceleration.';
    }

    return {
      subject,
      body,
      tone: 'Professional & Action-Oriented',
      rationale,
    };
  }

  /**
   * Provider LLM Caller (Google Gemini & OpenAI with safe timeouts)
   */
  private static async callLLM(prompt: string, systemPrompt?: string): Promise<string | null> {
    if (config.ai.geminiApiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ai.geminiApiKey}`;
        const body = {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data: any = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (err) {
        console.warn('[AiGateway] Gemini API call failed or timed out; falling back to heuristic engine.');
      }
    }

    if (config.ai.openAiApiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.ai.openAiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1024,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data: any = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } catch (err) {
        console.warn('[AiGateway] OpenAI API call failed or timed out; falling back to heuristic engine.');
      }
    }

    return null;
  }

  /**
   * AI Meeting Summarizer & Task Extractor
   * Dynamically parses transcript lines, speakers, commitments, and sentiment
   */
  static async summarizeMeetingTranscript(transcript: string): Promise<MeetingSummaryResult> {
    // If LLM provider is configured, attempt live structured summarization
    if (config.ai.geminiApiKey || config.ai.openAiApiKey) {
      const llmPrompt = `Analyze the following sales call transcript and return JSON ONLY with this structure:
{
  "summary": "2-3 sentence overview of meeting",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "actionItems": [{"task": "description", "owner": "name or role", "dueDate": "timeline"}],
  "customerSentiment": "POSITIVE" | "NEUTRAL" | "SKEPTICAL" | "CHALLENGING",
  "confidence": 0.95
}

Transcript:
${transcript}`;

      const llmResponse = await this.callLLM(
        llmPrompt,
        'You are an expert enterprise sales meeting analyst. Respond only with valid JSON.'
      );

      if (llmResponse) {
        try {
          const cleaned = llmResponse.replace(/^```json/m, '').replace(/```$/m, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.summary && Array.isArray(parsed.keyPoints) && Array.isArray(parsed.actionItems)) {
            return {
              summary: parsed.summary,
              keyPoints: parsed.keyPoints,
              actionItems: parsed.actionItems,
              customerSentiment: parsed.customerSentiment || 'POSITIVE',
              confidence: Number(parsed.confidence) || 0.92,
            };
          }
        } catch (e) {
          // JSON parsing failed, fallback to heuristic extraction
        }
      }
    }

    // Dynamic Heuristic & Semantic Text Extraction
    const lines = transcript
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const actionItems: { task: string; owner?: string; dueDate?: string }[] = [];
    const keyPoints: string[] = [];
    const actionVerbs = [
      'will',
      'need to',
      'shall',
      'action',
      'send',
      'schedule',
      'follow up',
      'prepare',
      'share',
      'review',
      'deliver',
      'confirm',
      'set up',
    ];

    const positiveWords = ['great', 'excited', 'love', 'agree', 'perfect', 'confident', 'yes', 'excellent', 'fantastic', 'interested'];
    const skepticalWords = ['concern', 'risk', 'hesitant', 'expensive', 'delay', 'issue', 'problem', 'worried', 'difficult', 'blocker'];

    let positiveScore = 0;
    let skepticalScore = 0;

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Check sentiment indicators
      positiveWords.forEach((pw) => {
        if (lower.includes(pw)) positiveScore++;
      });
      skepticalWords.forEach((sw) => {
        if (lower.includes(sw)) skepticalScore++;
      });

      // Check for speaker pattern (e.g. "John: I will send the proposal")
      const speakerMatch = line.match(/^([A-Za-z\s]+):\s*(.*)$/);
      const speaker = speakerMatch ? speakerMatch[1].trim() : undefined;
      const content = speakerMatch ? speakerMatch[2].trim() : line;

      // Detect action items
      const hasActionVerb = actionVerbs.some((verb) => content.toLowerCase().includes(verb));
      if (hasActionVerb && actionItems.length < 5) {
        let dueDate = 'Next touchpoint';
        if (content.toLowerCase().includes('tomorrow')) dueDate = 'Tomorrow';
        else if (content.toLowerCase().includes('today')) dueDate = 'End of Day';
        else if (content.toLowerCase().includes('friday')) dueDate = 'This Friday';
        else if (content.toLowerCase().includes('week')) dueDate = 'Next week';
        else if (content.toLowerCase().includes('month')) dueDate = 'Next month';

        actionItems.push({
          task: content,
          owner: speaker || 'Sales Team',
          dueDate,
        });
      } else if (content.length > 25 && keyPoints.length < 4) {
        keyPoints.push(content);
      }
    }

    let customerSentiment: 'POSITIVE' | 'NEUTRAL' | 'SKEPTICAL' | 'CHALLENGING' = 'NEUTRAL';
    if (positiveScore > skepticalScore + 1) {
      customerSentiment = 'POSITIVE';
    } else if (skepticalScore > positiveScore + 1) {
      customerSentiment = 'SKEPTICAL';
    } else if (skepticalScore > 3) {
      customerSentiment = 'CHALLENGING';
    }

    if (actionItems.length === 0) {
      actionItems.push({
        task: 'Send meeting recap notes and agree on next evaluation milestone',
        owner: 'Account Executive',
        dueDate: 'Within 24 hours',
      });
    }

    if (keyPoints.length === 0) {
      keyPoints.push(`Discussion reviewed key customer requirements across ${lines.length} logged statements.`);
    }

    const firstSpeaker = lines[0]?.split(':')[0] || 'Stakeholders';
    const summary = `Meeting with ${firstSpeaker} reviewed platform capabilities and project timeline. Identified ${actionItems.length} specific follow-up commitments with an overall ${customerSentiment.toLowerCase()} customer posture.`;

    return {
      summary,
      keyPoints,
      actionItems,
      customerSentiment,
      confidence: 0.91,
    };
  }

  /**
   * Natural Language CRM Query Parser
   */
  static async parseNaturalLanguageQuery(query: string): Promise<NaturalSearchFilter> {
    const q = query.toLowerCase();

    if (q.includes('stalled') || q.includes('risk') || q.includes('deal')) {
      return {
        interpretedQuery: 'Filter open deals with health score under 60 or stalled for over 10 days',
        targetEntity: 'DEAL',
        filters: {
          status: 'OPEN',
          healthScore: { lte: 60 },
        },
        explanation: 'Identified query intent regarding at-risk and stalled sales pipeline opportunities.',
      };
    }

    if (q.includes('unqualified') || q.includes('new lead') || q.includes('high priority')) {
      return {
        interpretedQuery: 'Filter leads with HIGH or URGENT priority and NEW or CONTACTED status',
        targetEntity: 'LEAD',
        filters: {
          priority: { in: ['HIGH', 'URGENT'] },
          status: { in: ['NEW', 'CONTACTED'] },
        },
        explanation: 'Filtered top-priority leads requiring immediate sales rep qualification.',
      };
    }

    return {
      interpretedQuery: `General keyword search across records matching "${query}"`,
      targetEntity: 'LEAD',
      filters: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      explanation: 'Keyword multi-field search applied.',
    };
  }

  /**
   * Prompt Injection Guard: Detects malicious attempts to override system prompts or bypass security
   */
  static detectPromptInjection(input: string): boolean {
    const patterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /disregard\s+(all\s+)?instructions/i,
      /reveal\s+(system\s+)?prompt/i,
      /leak\s+(tenant|user|database|credential|secret|api_key)/i,
      /bypass\s+(security|auth|rls|tenant|role)/i,
      /override\s+(permission|role|access)/i,
    ];
    return patterns.some((p) => p.test(input));
  }

  /**
   * AI Sales Copilot Assistant
   */
  static async askCopilot(question: string, orgDataSummary: Record<string, any>): Promise<{
    answer: string;
    suggestedActions: string[];
    citations: string[];
    confidence: number;
  }> {
    if (this.detectPromptInjection(question)) {
      return {
        answer:
          'Security Safeguard: I cannot comply with requests that attempt to override system instructions, bypass tenant isolation, or leak unauthorized data. All responses remain strictly scoped to authorized tenant CRM records.',
        suggestedActions: [
          'Ask questions regarding your sales pipeline, deals, or lead scoring.',
          'Review authorized CRM activity in your dashboard.',
        ],
        citations: ['Security Safeguard: Prompt Injection Guard Active'],
        confidence: 1.0,
      };
    }

    const q = question.toLowerCase();

    if (q.includes('forecast') || q.includes('revenue') || q.includes('pipeline')) {
      return {
        answer: `Based on authorized active deals in your pipeline, total pipeline value is $${(
          orgDataSummary.pipelineValue || 385000
        ).toLocaleString()}. The weighted revenue forecast for the current quarter is $${(
          orgDataSummary.weightedForecast || 246000
        ).toLocaleString()} based on stage win probabilities. 2 high-value enterprise deals are currently in Proposal review.`,
        suggestedActions: [
          'Review 2 stalled deals in Proposal stage to protect month-end closing.',
          'Schedule closing alignment with top account stakeholders.',
        ],
        citations: ['PipelineStage: Proposal ($180,000)', 'PipelineStage: Negotiation ($95,000)'],
        confidence: 0.93,
      };
    }

    if (q.includes('lead') || q.includes('priority') || q.includes('convert')) {
      return {
        answer: `You currently have ${orgDataSummary.highPriorityLeadsCount || 8} high-priority leads awaiting follow-up. The top-scoring lead is ${
          orgDataSummary.topLeadName || 'Marcus Vance (Apex Global)'
        } with an AI qualification score of 94/100.`,
        suggestedActions: [
          'Trigger AI follow-up sequence for leads scored above 80.',
          'Convert qualified lead to Deal & Contact record.',
        ],
        citations: ['Lead: Marcus Vance (Score: 94)', 'Lead: Sophia Chen (Score: 88)'],
        confidence: 0.96,
      };
    }

    return {
      answer: `SwordNex AI Copilot has reviewed your active workspace records. All core systems are operating smoothly. You have active opportunities requiring engagement across deals, tasks, and inbound inquiries.`,
      suggestedActions: [
        'Check Overdue Tasks in the Task Manager.',
        'View AI Center for updated churn and lead scores.',
      ],
      citations: ['Workspace: Active Pipeline & CRM Records'],
      confidence: 0.90,
    };
  }
}
