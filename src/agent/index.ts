// TODO (Week 4): Financial Document Agent
//
// LangGraph-based agent for complex financial document tasks:
//
// 1. Agent State
//    - Conversation history
//    - Retrieved documents context
//    - Tool call history
//    - Current reasoning step
//
// 2. Tools
//    - searchDocuments: Query the RAG pipeline
//    - extractTable: Parse financial tables from documents
//    - calculateMetric: Compute financial ratios and metrics
//    - compareDocuments: Cross-reference multiple documents
//
// 3. Graph Nodes
//    - routeQuery: Determine if query needs agent or simple RAG
//    - retrieve: Fetch relevant documents
//    - reason: LLM reasoning step
//    - act: Execute tool calls
//    - respond: Generate final response
//
// 4. Integration
//    - Use src/llm/client.ts for all LLM calls
//    - Use src/vectordb/client.ts for document search
//    - Log all steps via src/llmops/logger.ts

export {};
