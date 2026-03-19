import { Client, GatewayIntentBits, Events } from "discord.js";
import Agent from "./Agent";
import MCPClient from "./MCPClient";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let agent: Agent;

async function startBot() {
  // Set up your MCP clients here
  const mcpClient = new MCPClient("lolAIAgent", "0.0.1");
  await mcpClient.init();
  agent = new Agent(
    [mcpClient],
    "You are an expert in League of Legends gameplay and strategy. Provide detailed and accurate information to users based on their queries about the game.",
  );
  await agent.init();

  client.once(Events.ClientReady, (c) => {
    console.log(`Logged in as ${c.user.tag}`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    try {
      await message.channel.sendTyping();
      const response = await agent.chat(message.content);

      if (response.length <= 2000) {
        await message.reply(response);
      } else {
        const chunks = response.match(/[\s\S]{1,2000}/g) || [];
        for (const chunk of chunks) {
          await message.channel.send(chunk);
        }
      }
    } catch (error) {
      console.error(error);
      await message.reply("Something went wrong.");
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
}

startBot().catch(console.error);