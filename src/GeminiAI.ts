import { GoogleGenAI, Type, type Content, type Tool as GeminiTool, type FunctionCall, FunctionResponse, Part, Part } from '@google/genai';
import 'dotenv/config';
import { logTitle } from './util';
import { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';

export default class GeminiAI {
  private client: GoogleGenAI;
  private history: Content[] = [];
  private modelId: string;
  private tools: McpTool[];
  private systemPrompt?: string;

  constructor(tools: McpTool[], systemPrompt?: string, modelId?: string) {
    this.client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
    this.tools = tools;
    this.systemPrompt = systemPrompt;
    this.modelId = modelId || 'gemini-2.5-flash';
  }

  public async chat(userInput?: string) {
    logTitle("CHAT");
    if (userInput) this.history.push({ role: 'user', parts: [{ text: userInput }] });
    try {
      const result = await this.client.models.generateContentStream({
        model: this.modelId,
        contents: this.history,
        config: {
          systemInstruction: this.systemPrompt,
          tools: this.getToolsDefition(), // Now returns correctly formatted array
          temperature: 0.1, // Lower temperature is better for tool accuracy
        }
      });

      logTitle("RESPONSE");
      let content = '';
      let toolCalls: FunctionCall[] = [];

      // Iterate through result.response for cleaner stream handling
      for await (const chunk of result) {
        if (chunk.text) {
          content += chunk.text;
        }
        if (chunk.functionCalls) {
          toolCalls.push(...chunk.functionCalls);
        }
      }
      this.history.push({
        role: 'model',
        parts: [
          { text: content },
          ...toolCalls.map(call => ({
            functionCall: {
              name: call.name,
              args: call.args
            }
          }))]
      })
      return { content, toolCalls };
    } catch (error: any) {
      if (error.status === 503) {
        console.error("Model is overloaded. Try again in a few seconds.");
      }
      throw error;
    }
  }

  private getToolsDefition(): GeminiTool[] {
    return [{
      functionDeclarations: this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        parameters: {
          type: Type.OBJECT,
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required || [],
        },
      }))
    }];
  }

  public appendToHistory(responseParts: Part[]) {
    this.history.push({
      role: 'user',
      parts: responseParts
    });
  }
}