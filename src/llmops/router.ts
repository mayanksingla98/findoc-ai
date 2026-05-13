interface RouteDecision {
  model: string;
  reason: string;
}

type ContextType =
  | 'rag_generation'
  | 'agent_reasoning'
  | 'classification'
  | 'simple_lookup'
  | 'extraction'
  | 'general';

const CHEAP_CONTEXTS: ReadonlySet<ContextType> = new Set([
  'classification',
  'simple_lookup',
]);

const EXPENSIVE_CONTEXTS: ReadonlySet<ContextType> = new Set([
  'rag_generation',
  'agent_reasoning',
  'extraction',
]);

const SHORT_QUERY_WORD_LIMIT = 20;

function getCheapModel(): string {
  return process.env['CHEAP_MODEL'] ?? 'gpt-4o-mini';
}

function getExpensiveModel(): string {
  return process.env['DEFAULT_MODEL'] ?? 'gpt-4o';
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function routeModel(query: string, contextType: ContextType): RouteDecision {
  const cheapModel = getCheapModel();
  const expensiveModel = getExpensiveModel();

  let decision: RouteDecision;

  if (CHEAP_CONTEXTS.has(contextType)) {
    decision = {
      model: cheapModel,
      reason: `Context type "${contextType}" routed to cheap model`,
    };
  } else if (EXPENSIVE_CONTEXTS.has(contextType)) {
    decision = {
      model: expensiveModel,
      reason: `Context type "${contextType}" requires advanced reasoning`,
    };
  } else {
    const wordCount = countWords(query);

    if (wordCount < SHORT_QUERY_WORD_LIMIT) {
      decision = {
        model: cheapModel,
        reason: `Short query (${wordCount} words) routed to cheap model`,
      };
    } else {
      decision = {
        model: expensiveModel,
        reason: `Long query (${wordCount} words) routed to advanced model`,
      };
    }
  }

  if (process.env['NODE_ENV'] === 'development') {
    console.log(
      `[LLMOps:Router] ${decision.model} — ${decision.reason} (context: ${contextType})`,
    );
  }

  return decision;
}

export type { RouteDecision, ContextType };
