import { prisma } from '../../utils/prisma';
import { AiGateway } from '../ai/ai.gateway';

export interface WorkflowContext {
  organizationId: string;
  triggerType: string;
  entityType: 'LEAD' | 'DEAL' | 'TASK' | 'CONTACT';
  entityId: string;
  data: Record<string, any>;
}

export class WorkflowEngine {
  /**
   * Dispatches trigger events to active matching workflows
   */
  static async triggerEvent(context: WorkflowContext) {
    try {
      const activeWorkflows = await prisma.automationWorkflow.findMany({
        where: {
          organizationId: context.organizationId,
          triggerType: context.triggerType,
          isActive: true,
        },
      });

      if (!activeWorkflows || activeWorkflows.length === 0) {
        return;
      }

      for (const workflow of activeWorkflows) {
        await this.executeWorkflow(workflow, context);
      }
    } catch (error) {
      console.error('[WorkflowEngine.triggerEvent] Failed to dispatch workflow event:', error);
    }
  }

  /**
   * Executes a single workflow instance and records a WorkflowRun audit log
   */
  static async executeWorkflow(workflow: any, context: WorkflowContext) {
    const logs: string[] = [];
    const stepResults: Record<string, any> = {};
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let errorMessage: string | null = null;

    logs.push(`[${new Date().toISOString()}] Started execution for workflow "${workflow.name}" (ID: ${workflow.id})`);

    try {
      // 1. Evaluate Conditions (if any)
      const conditions = Array.isArray(workflow.conditions) ? workflow.conditions : [];
      let conditionsMet = true;

      for (const condition of conditions) {
        const { field, operator, value } = condition;
        const actualValue = context.data[field];

        if (operator === 'EQUALS' && actualValue !== value) {
          conditionsMet = false;
        } else if (operator === 'GREATER_THAN' && Number(actualValue) <= Number(value)) {
          conditionsMet = false;
        } else if (operator === 'CONTAINS' && !String(actualValue).toLowerCase().includes(String(value).toLowerCase())) {
          conditionsMet = false;
        }

        logs.push(`Condition check: ${field} ${operator} ${value} => ${conditionsMet ? 'PASS' : 'FAIL'}`);
        if (!conditionsMet) break;
      }

      if (!conditionsMet) {
        logs.push('Conditions not met. Workflow execution skipped.');
        await prisma.workflowRun.create({
          data: {
            workflowId: workflow.id,
            organizationId: context.organizationId,
            triggerEvent: context.triggerType,
            status: 'SUCCESS',
            inputData: context.data,
            executionLogs: logs,
            stepResults: { skipped: true, reason: 'Conditions not met' },
            completedAt: new Date(),
          },
        });
        return;
      }

      // 2. Execute Actions
      const actions = Array.isArray(workflow.actions) ? workflow.actions : [];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        logs.push(`Executing Step ${i + 1}: ${action.type}`);

        switch (action.type) {
          case 'CALCULATE_AI_SCORE': {
            if (context.entityType === 'LEAD') {
              const scoreResult = await AiGateway.scoreLead(context.data);
              await prisma.lead.update({
                where: { id: context.entityId },
                data: {
                  score: scoreResult.score,
                  scoreExplanation: scoreResult.summary,
                  scoreConfidence: scoreResult.confidence,
                },
              });
              stepResults[`step_${i + 1}`] = { score: scoreResult.score, summary: scoreResult.summary };
              logs.push(`Lead score computed: ${scoreResult.score}/100`);
            }
            break;
          }

          case 'CREATE_TASK': {
            const task = await prisma.task.create({
              data: {
                organizationId: context.organizationId,
                title: action.params?.title || 'Automated CRM Task Follow-up',
                description: action.params?.description || 'Generated automatically by SwordNex Automation Engine',
                priority: action.params?.priority || 'HIGH',
                status: 'PENDING',
                category: 'FOLLOW_UP',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
                assignedToId: action.params?.assignedToId || null,
                leadId: context.entityType === 'LEAD' ? context.entityId : null,
                dealId: context.entityType === 'DEAL' ? context.entityId : null,
                aiSuggested: true,
              },
            });
            stepResults[`step_${i + 1}`] = { createdTaskId: task.id, title: task.title };
            logs.push(`Created follow-up task "${task.title}" with ID ${task.id}`);
            break;
          }

          case 'UPDATE_STATUS': {
            if (context.entityType === 'LEAD' && action.params?.status) {
              await prisma.lead.update({
                where: { id: context.entityId },
                data: { status: action.params.status },
              });
              stepResults[`step_${i + 1}`] = { updatedStatus: action.params.status };
              logs.push(`Updated lead status to ${action.params.status}`);
            }
            break;
          }

          case 'ADD_ACTIVITY_NOTE': {
            await prisma.activity.create({
              data: {
                organizationId: context.organizationId,
                type: 'NOTE',
                title: action.params?.title || 'Workflow Action Logged',
                description: action.params?.description || `Action triggered via workflow ${workflow.name}`,
                leadId: context.entityType === 'LEAD' ? context.entityId : null,
                dealId: context.entityType === 'DEAL' ? context.entityId : null,
              },
            });
            logs.push(`Activity note logged successfully`);
            break;
          }

          default:
            logs.push(`Action type "${action.type}" handled via default execution handler.`);
        }
      }

      // Update workflow run metrics
      await prisma.automationWorkflow.update({
        where: { id: workflow.id },
        data: {
          runCount: { increment: 1 },
          lastRunAt: new Date(),
        },
      });

      logs.push(`Workflow completed successfully at ${new Date().toISOString()}`);
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message || 'Unknown error during workflow execution';
      logs.push(`ERROR: ${errorMessage}`);
    }

    // Save WorkflowRun log
    await prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        organizationId: context.organizationId,
        triggerEvent: context.triggerType,
        status,
        inputData: context.data,
        executionLogs: logs,
        stepResults,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }
}
