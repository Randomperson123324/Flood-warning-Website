import type { ToolDefinition } from "@/lib/ai/types"
import { TOOL_REGISTRY } from "@/lib/ai/tools/tool-registry"

/** Derive ToolDefinition[] from the registry (single source of truth) */
export function getToolDefinitions(): ToolDefinition[] {
  return TOOL_REGISTRY.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))
}

/** Convert to OpenAI-compatible function calling format */
export function toOpenAITools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

/** Convert to Gemini function declarations format */
export function toGeminiTools(tools: ToolDefinition[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ]
}
