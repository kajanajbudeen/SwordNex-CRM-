import { describe, it, expect } from 'vitest';
import { AiGateway } from '../src/services/ai/ai.gateway';

describe('AI Gateway & Intelligent Sales Heuristics', () => {
  it('should score high-priority executive corporate lead above 75', async () => {
    const result = await AiGateway.scoreLead({
      title: 'Chief Technology Officer',
      company: 'Enterprise Corp',
      email: 'cto@enterprisecorp.com',
      phone: '+1 555 123 4567',
      source: 'REFERRAL',
    });

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.factors.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.summary).toContain('Priority Tier 1');
  });

  it('should evaluate stalled deal and identify risk factors', async () => {
    const result = await AiGateway.evaluateDealHealth({
      amount: 120000,
      stageName: 'Proposal',
      daysInCurrentStage: 21,
      activitiesCount: 1,
    });

    expect(result.healthScore).toBeLessThan(75);
    expect(['AT_RISK', 'CRITICAL']).toContain(result.status);
    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
