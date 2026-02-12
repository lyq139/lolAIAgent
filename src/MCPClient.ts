import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logTitle } from './util';
import 'dotenv/config';
export default class MCPClient {
    private mcp: Client;
    private tools: Tool[] = [];

    constructor(name: string, version?: string) {
        this.mcp = new Client({ name, version: version || "0.0.1" });
    }

    public async init() {
        await this.connectToServer();
    }

    public async close() {
        await this.mcp.close();
    }

    public getTools() {
        return this.tools;
    }

    public callTool(name: string, params: Record<string, unknown>) {
        return this.mcp.callTool({
            name: name,
            arguments: params
        });
    }

    public hasTool(name: string): boolean {
        return this.tools.some(tool => tool.name === name);
    }

    private async connectToServer() {
        try {
            const transport = new StreamableHTTPClientTransport(
                new URL(process.env.OP_GG_MCP_HOST!)
            );
            await this.mcp.connect(transport);

            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools;
        } catch (error) {
            console.error("Failed to connect to MCP server:", error);
        }
    }
}