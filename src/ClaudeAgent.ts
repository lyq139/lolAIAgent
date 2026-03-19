import ClaudeAI from "./ClaudeAI";
import MCPClient from "./MCPClient";
import { logTitle } from "./util";

export default class ClaudeAgent {
  private mcpClients: MCPClient[];
  private llm: ClaudeAI;
  private modelId: string;
  private systemInstruction: string;

  constructor(mcpClients: MCPClient[], systemInstruction: string, modelId?: string) {
    this.mcpClients = mcpClients;
    this.systemInstruction = systemInstruction;
    this.modelId = modelId || "claude-sonnet-4-5-20250514";
  }

  public async init() {
    const tools = this.mcpClients.flatMap((client) => client.getTools());
    this.llm = new ClaudeAI(tools, this.systemInstruction, this.modelId);
  }

  public async close() {
    for (const client of this.mcpClients) {
      await client.close();
    }
  }

  public async chat(userInput: string) {
    if (!this.llm) {
      throw new Error("Agent not initialized. Call init() before chat().");
    }

    let response = await this.llm.chat(userInput);

    while (true) {
      if (response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          const mcp = this.mcpClients.find((client) => client.hasTool(toolCall.name));
          if (mcp) {
            logTitle(`CALLING TOOL: ${toolCall.name}`);
            const result = await mcp.callTool(toolCall.name, toolCall.input);
            this.llm.appendToolResult(toolCall.id, result);
          } else {
            const errorResult = {
              error: "Tool not found",
              message: `The tool '${toolCall.name}' is not registered in any available MCP clients.`,
            };
            this.llm.appendToolResult(toolCall.id, errorResult);
          }
        }
        response = await this.llm.chat();
        continue;
      }

      await this.close();
      return response.content;
    }
  }
}