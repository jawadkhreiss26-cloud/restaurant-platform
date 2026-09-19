import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { buildSystemPrompt, PromptContext } from "./prompt";
import { AgentActionSchema, type AgentAction } from "./schemas";
import { applyGuardrails, GuardrailContext } from "./guardrails";

const PROMPT_VERSION = "sales-closer-v1";

export interface RunTurnResult {
  action: AgentAction;
  violations: string[];
  raw: string;
  usedMock: boolean;
}

/**
 * Runs one AI Sales Closer turn: build prompt -> call Claude with a forced
 * JSON tool-call for structured output -> validate -> guardrail -> return.
 * Falls back to a deterministic mock responder when no API key is
 * configured, so the whole conversation flow is testable/demoable without
 * credentials.
 */
export async function runAgentTurn(
  promptCtx: PromptContext,
  guardCtx: GuardrailContext
): Promise<RunTurnResult> {
  if (!config.ai.isLive) {
    const mock = mockAgentAction(promptCtx);
    const { action, violations } = applyGuardrails(mock, guardCtx);
    return { action, violations, raw: JSON.stringify(mock), usedMock: true };
  }

  const client = new Anthropic({ apiKey: config.ai.apiKey });
  const system = buildSystemPrompt(promptCtx);

  const schemaTool = {
    name: "submit_agent_action",
    description: "Submit the structured sales-closer decision for this turn.",
    input_schema: {
      type: "object" as const,
      properties: {
        nextStage: { type: "string" },
        reply: { type: ["string", "null"] },
        toolCalls: { type: "array", items: { type: "object" } },
        confidence: { type: "number" },
        discountOffered: { type: ["number", "null"] },
        escalate: { type: ["object", "null"] },
        detectedObjection: { type: ["string", "null"] }
      },
      required: ["nextStage", "confidence", "toolCalls"]
    }
  };

  const response = await client.messages.create({
    model: config.ai.model,
    max_tokens: 800,
    system,
    tools: [schemaTool],
    tool_choice: { type: "tool", name: "submit_agent_action" },
    messages: [{ role: "user", content: "Decide the next sales-closer action for this turn." }]
  });

  const toolUse = response.content.find((c) => c.type === "tool_use") as any;
  const raw = JSON.stringify(toolUse?.input ?? {});

  let parsed: AgentAction;
  try {
    parsed = AgentActionSchema.parse(toolUse?.input);
  } catch (e) {
    // Schema-invalid output is treated as zero confidence and escalated,
    // never guessed at.
    parsed = {
      nextStage: promptCtx.currentStage as AgentAction["nextStage"],
      reply: null,
      toolCalls: [],
      confidence: 0,
      discountOffered: null,
      escalate: { reason: "technical_failure" },
      detectedObjection: null
    };
  }

  const { action, violations } = applyGuardrails(parsed, guardCtx);
  return { action, violations, raw, usedMock: false };
}

/**
 * Deterministic mock so the full CRM/conversation flow can be demoed and
 * tested with zero AI credentials. Not meant to be linguistically clever —
 * just safe, on-schema, and stage-progressing.
 */
function mockAgentAction(ctx: PromptContext): AgentAction {
  const msg = ctx.latestCustomerMessage.toLowerCase();
  if (/سعر|غالي|price|expensive/.test(msg)) {
    return {
      nextStage: "OBJECTION_HANDLING",
      reply:
        "أتفهّمك أستاذ. السعر يشمل ترتيب الموقع والمنيو، نسخة الموبايل، وربط الإنستغرام والمسنجر، وياها استضافة ثلاثة أشهر. تحب نشوف الملاحظات على الموقع نفسه؟",
      toolCalls: [],
      confidence: 0.7,
      discountOffered: null,
      escalate: null,
      detectedObjection: "price"
    };
  }
  if (/رابط|link|preview|نموذج/.test(msg)) {
    return {
      nextStage: "PREVIEW_SENT",
      reply: `هلا بيك أستاذ، هذا النموذج الأولي إلكم: ${ctx.previewUrl ?? "(سيتم إرساله قريباً)"}. شوفه براحتك، وكل المعلومات قابلة للتعديل.`,
      toolCalls: [{ tool: "send_preview_message", args: {} }],
      confidence: 0.8,
      discountOffered: null,
      escalate: null,
      detectedObjection: null
    };
  }
  return {
    nextStage: "GREETING",
    reply: `هلا بيك أستاذ، وياك ${ctx.aiAssistantName} من ${ctx.companyName}. شفنا مطعم ${ctx.restaurantName} وحبّينا نجهز إلكم نموذج أولي للموقع. إذا تسمح، أرسل لك الرابط تشوفه؟`,
    toolCalls: [],
    confidence: 0.75,
    discountOffered: null,
    escalate: null,
    detectedObjection: null
  };
}

export { PROMPT_VERSION };
export type { PromptContext };
