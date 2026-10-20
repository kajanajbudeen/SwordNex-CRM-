import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Mail,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  Send,
  Zap,
  Target,
} from 'lucide-react';
import { apiClient } from '../../api/client';

export const AiCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AGENTS' | 'EMAIL' | 'MEETING' | 'SCORING'>('AGENTS');

  // Agent State
  const [agentRuns, setAgentRuns] = useState<any[]>([]);
  const [agentPrompt, setAgentPrompt] = useState('Research target technographics for CloudScale Technologies and draft an outreach plan.');
  const [selectedAgent, setSelectedAgent] = useState('LEAD_RESEARCH');
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);

  // Email Writer State
  const [emailForm, setEmailForm] = useState({
    recipientName: 'Elena Rostova',
    recipientCompany: 'CloudScale Technologies',
    objective: 'PROPOSAL_SUBMISSION',
  });
  const [generatedEmail, setGeneratedEmail] = useState<any | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  // Meeting Summarizer State
  const [transcript, setTranscript] = useState(
    'Elena Rostova (VP of Commercial Strategy): Thank you for the demo. We love the automatic lead scoring and multi-tenant design. We currently have 35 sales agents and want to migrate by next month. The main hurdle is data migration from Salesforce and custom roles. Can you send an SLA draft and migration plan by this Thursday?'
  );
  const [meetingSummary, setMeetingSummary] = useState<any | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Scoring Simulator State
  const [scoreInput, setScoreInput] = useState({
    title: 'Chief Technology Officer',
    company: 'Nexus Global',
    email: 'cto@nexusglobal.com',
    source: 'REFERRAL',
  });
  const [scoreResult, setScoreResult] = useState<any | null>(null);

  const fetchAgentRuns = async () => {
    try {
      const res = await apiClient.get('/ai/agent-runs');
      if (res.success) setAgentRuns(res.data);
    } catch (err) {
      console.error('Failed to load agent runs:', err);
    }
  };

  useEffect(() => {
    fetchAgentRuns();
  }, []);

  const handleTriggerAgent = async () => {
    setIsAgentExecuting(true);
    try {
      const res = await apiClient.post('/ai/agent-run', {
        agentName: selectedAgent,
        prompt: agentPrompt,
      });
      if (res.success) {
        fetchAgentRuns();
        alert('Autonomous Agent Run registered! Check execution status or approval queue.');
      }
    } catch (err: any) {
      alert(`Agent execution failed: ${err.message}`);
    } finally {
      setIsAgentExecuting(false);
    }
  };

  const handleApproveAgent = async (runId: string) => {
    try {
      const res = await apiClient.post(`/ai/agent-runs/${runId}/approve`);
      if (res.success) {
        fetchAgentRuns();
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleGenerateEmail = async () => {
    setIsGeneratingEmail(true);
    try {
      const res = await apiClient.post('/ai/generate-email', emailForm);
      if (res.success) setGeneratedEmail(res.data);
    } catch (err: any) {
      alert(`Email generation failed: ${err.message}`);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleSummarizeMeeting = async () => {
    setIsSummarizing(true);
    try {
      const res = await apiClient.post('/ai/meeting-summary', { transcript });
      if (res.success) setMeetingSummary(res.data);
    } catch (err: any) {
      alert(`Meeting summary failed: ${err.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRunScoring = async () => {
    try {
      const res = await apiClient.post('/ai/lead-score', scoreInput);
      if (res.success) setScoreResult(res.data);
    } catch (err: any) {
      alert(`Scoring failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <span>SwordNex AI Intelligence Center</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            AUTONOMOUS CORE
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Orchestrate explainable lead scoring, autonomous sales agents, email generation, and meeting summaries.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        {[
          { key: 'AGENTS', label: 'Autonomous Agents & Approval Queue' },
          { key: 'EMAIL', label: 'Personalized Email Drafter' },
          { key: 'MEETING', label: 'Meeting Intelligence & Task Extractor' },
          { key: 'SCORING', label: 'Explainable Scoring Simulator' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === tab.key
                ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: AUTONOMOUS AGENTS */}
      {activeTab === 'AGENTS' && (
        <div className="space-y-6">
          {/* Agent Launcher */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-2 flex items-center space-x-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Launch Autonomous CRM Agent</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Autonomous agents execute authorized multi-step research and workflows with strict human approval gates.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Agent Specialist</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100"
                >
                  <option value="LEAD_RESEARCH">Lead Research & Account Enrichment Agent</option>
                  <option value="SALES_FOLLOWUP">Sales Follow-up Agent (Requires Human Approval)</option>
                  <option value="CUSTOMER_ONBOARDING">Customer Onboarding Roadmap Agent</option>
                  <option value="RETENTION">Customer Retention & Risk Mitigator</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Instruction / Goal</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                  <button
                    onClick={handleTriggerAgent}
                    disabled={isAgentExecuting}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1 shadow-glow-cyan transition flex-shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isAgentExecuting ? 'Executing...' : 'Run Agent'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Execution & Approval Queue */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Human-in-the-Loop Approval Queue & Execution Logs</span>
            </h3>

            <div className="space-y-3">
              {agentRuns.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No autonomous agent executions logged yet.</p>
              ) : (
                agentRuns.map((run) => (
                  <div
                    key={run.id}
                    className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-100">{run.agentName}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                            run.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : run.status === 'WAITING_APPROVAL'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-1">{run.prompt}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Started: {new Date(run.startedAt).toLocaleString()} • Cost: ${run.costUsd.toFixed(4)} ({run.tokensUsed} tokens)
                      </p>
                    </div>

                    {run.status === 'WAITING_APPROVAL' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleApproveAgent(run.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition"
                        >
                          Approve Action
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL DRAFTER */}
      {activeTab === 'EMAIL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center space-x-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>Configure AI Outreach Email</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={emailForm.recipientName}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Target Account / Company</label>
                <input
                  type="text"
                  value={emailForm.recipientCompany}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientCompany: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Outreach Objective</label>
                <select
                  value={emailForm.objective}
                  onChange={(e) => setEmailForm({ ...emailForm, objective: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100"
                >
                  <option value="PROPOSAL_SUBMISSION">Proposal Submission & Pricing Walkthrough</option>
                  <option value="FOLLOW_UP">Post-Discovery Next Steps Follow-up</option>
                  <option value="COLD_OUTREACH">Cold Strategic Inbound Outreach</option>
                </select>
              </div>

              <button
                onClick={handleGenerateEmail}
                disabled={isGeneratingEmail}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition mt-2"
              >
                {isGeneratingEmail ? 'Synthesizing Email Draft...' : 'Generate Personalized Email'}
              </button>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 mb-3">Generated Sales Copy</h3>
              {generatedEmail ? (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-mono text-cyan-400 block mb-0.5">SUBJECT:</span>
                    <p className="font-semibold text-slate-100">{generatedEmail.subject}</p>
                  </div>

                  <div className="p-3 rounded bg-slate-900 border border-slate-800 whitespace-pre-line text-slate-200 leading-relaxed font-sans">
                    {generatedEmail.body}
                  </div>

                  <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono">
                    <span className="text-cyan-400">AI RATIONALE: </span>
                    {generatedEmail.rationale}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                  Configure options on the left and click Generate.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MEETING INTELLIGENCE */}
      {activeTab === 'MEETING' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-2 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Meeting Transcript Ingestion</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Paste customer call notes or transcripts to extract structured summaries and actionable tasks.
            </p>

            <textarea
              rows={8}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 font-mono resize-none mb-3"
            ></textarea>

            <button
              onClick={handleSummarizeMeeting}
              disabled={isSummarizing}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition"
            >
              {isSummarizing ? 'Analyzing Transcript...' : 'Extract Summary & Tasks'}
            </button>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-3">Extracted Meeting Intelligence</h3>

            {meetingSummary ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-cyan-400 block mb-1">EXECUTIVE SUMMARY:</span>
                  <p className="text-slate-200 leading-relaxed">{meetingSummary.summary}</p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-cyan-400 block mb-1.5 uppercase">
                    Extracted Action Items ({meetingSummary.actionItems?.length || 0}):
                  </span>
                  <div className="space-y-1.5">
                    {meetingSummary.actionItems?.map((act: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-slate-200">{act.task}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{act.dueDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                Click "Extract Summary & Tasks" to synthesize notes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SCORING SIMULATOR */}
      {activeTab === 'SCORING' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center space-x-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span>Multi-Factor Lead Scoring Simulator</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Job Title / Seniority</label>
                <input
                  type="text"
                  value={scoreInput.title}
                  onChange={(e) => setScoreInput({ ...scoreInput, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={scoreInput.email}
                  onChange={(e) => setScoreInput({ ...scoreInput, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Source Channel</label>
                <select
                  value={scoreInput.source}
                  onChange={(e) => setScoreInput({ ...scoreInput, source: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100"
                >
                  <option value="REFERRAL">Customer Referral (Highest Signal)</option>
                  <option value="WEBSITE">Website Direct Inbound</option>
                  <option value="LINKEDIN">LinkedIn Social Campaign</option>
                  <option value="COLD_CALL">Cold Outreach</option>
                </select>
              </div>

              <button
                onClick={handleRunScoring}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition mt-2"
              >
                Compute Multi-Factor Predictive Score
              </button>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-3">Scoring Output & Factor Breakdown</h3>
            {scoreResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-cyan-300 font-mono font-semibold">PREDICTED SCORE</span>
                    <p className="text-slate-200 mt-1">{scoreResult.summary}</p>
                  </div>
                  <span className="text-3xl font-black font-mono text-cyan-400">
                    {scoreResult.score}/100
                  </span>
                </div>

                <div className="space-y-2">
                  {scoreResult.factors?.map((f: any, i: number) => (
                    <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="flex justify-between font-semibold text-slate-200 mb-0.5">
                        <span>{f.signal}</span>
                        <span className="text-emerald-400 font-mono">+{f.impact} pts</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{f.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                Click "Compute Multi-Factor Predictive Score" to simulate.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
