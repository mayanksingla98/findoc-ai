// TODO (Week 5): Input/output guardrails for financial document AI
//
// validateInput(prompt: string): Promise<{ safe: boolean; reason?: string }>
//   - Detect prompt injection attempts
//   - Check for attempts to extract system prompts
//   - Validate input length limits
//
// validateOutput(output: string, expectedFormat?: 'json' | 'text'): Promise<{ valid: boolean; retryNeeded: boolean; reason?: string }>
//   - JSON format validation when expectedFormat is 'json'
//   - Check for hallucinated financial data patterns
//   - Trigger retry if output is malformed
//
// enforceTopicBoundary(query: string): Promise<{ onTopic: boolean; reason?: string }>
//   - Verify query is within financial document domain
//   - Reject off-topic queries with helpful redirect message
//   - Allow general greetings and meta-questions about capabilities

export {};
