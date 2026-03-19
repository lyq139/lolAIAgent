import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ToolUseBlock, TextBlock } from "@anthropic-ai/sdk/resources/messages";
import "dotenv/config";
import { logTitle } from "./util";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";

export default class ClaudeAI {
  private client: Anthropic;
  private history: MessageParam[] = [];
  private modelId: string;
  private tools: McpTool[];
  private systemPrompt?: string;

  constructor(tools: McpTool[], systemPrompt?: string, modelId?: string) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    this.tools = tools;
    this.systemPrompt = systemPrompt;
    this.modelId = modelId || "claude-sonnet-4-5-20250514";
  }

  public async chat(userInput?: string) {
    logTitle("CHAT");
    if (userInput) this.history.push({ role: "user", content: userInput });

    try {
      const result = await this.client.messages.create({
        model: this.modelId,
        max_tokens: 4096,
        ...(this.systemPrompt && { system: this.systemPrompt }),
        messages: this.history,
        tools: this.getToolsDefinition(),
      });

      logTitle("RESPONSE");

      const content = result.content
        .filter((block): block is TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      const toolCalls = result.content.filter(
        (block): block is ToolUseBlock => block.type === "tool_use"
      );

      this.history.push({ role: "assistant", content: result.content });

      return { content, toolCalls };
    } catch (error: any) {
      if (error.status === 529) {
        console.error("Model is overloaded. Try again in a few seconds.");
      }
      throw error;
    }
  }

  private getToolsDefinition(): Tool[] {
    return this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: {
        type: "object" as const,
        properties: tool.inputSchema.properties,
        required: tool.inputSchema.required || [],
      },
    }));
  }

  public appendToolResult(toolUseId: string, result: unknown) {
    this.history.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          content: typeof result === "string" ? result : JSON.stringify(result),
        },
      ],
    });
  }
}