import { Part } from "@google/genai";
import GeminiAI from "./GeminiAI";
import MCPClient from "./MCPClient";
import { logTitle } from "./util";

export default class Agent {
    private mcpClients: MCPClient[];
    private llm: GeminiAI
    private modelId: string;
    private systemInstruction: string;
    
    constructor(mcpClients: MCPClient[], systemInstruction: string, modelId?: string) {
        this.mcpClients = mcpClients;
        this.systemInstruction = systemInstruction;
        this.modelId = modelId || 'gemini-2.5-flash';
    }

    public async init() {
        const tools = this.mcpClients.flatMap(client => client.getTools());
        this.llm = new GeminiAI(tools, this.systemInstruction, this.modelId);
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
                const responseParts: Part[] = [];
                for (const toolCall of response.toolCalls) {
                    const mcp = this.mcpClients.find(client => client.hasTool(toolCall.name!));
                    if (mcp) {
                        logTitle(`CALLING TOOL: ${toolCall.name}`);
                        const result = await mcp.callTool(toolCall.name!, toolCall.args!);
                        responseParts.push({
                            functionResponse: {
                                name: toolCall.name,
                                response: result
                            }
                        });
                    } else {
                        const errorResult = { 
                            error: "Tool not found", 
                            message: `The tool '${toolCall.name}' is not registered in any available MCP clients.` 
                        };
                        responseParts.push({
                            functionResponse: {
                                name: toolCall.name,
                                response: errorResult
                            }
                        })
                    }
                }
                this.llm.appendToHistory(responseParts);
                response = await this.llm.chat();
                continue;
            }
            await this.close();
            return response.content;
        }
    }
}