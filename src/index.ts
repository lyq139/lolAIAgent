import MCPClient from "./MCPClient";
import Agent from "./Agent";
import { logTitle } from "./util";
import readline from "readline/promises";

async function main() {
    const mcpClient = new MCPClient("lolAIAgent", "0.0.1");
    await mcpClient.init();
    const systemInstruction = "You are an expert in League of Legends gameplay and strategy. Provide detailed and accurate information to users based on their queries about the game.";
    const agent = new Agent([mcpClient], systemInstruction, 'gemini-2.5-flash');
    await agent.init();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const userInput = await rl.question("Please enter your query: ");
    rl.close();
    const response = await agent.chat(userInput);
    logTitle("FINAL RESPONSE");
    console.log(response);
}
main();