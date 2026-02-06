import { Agent } from "@mastra/core/agent";
import { weatherTool } from "../tools/weather-tool";

export const weatherAgent = new Agent({
  id: "weather-agent",
  name: "Weather Agent",
  instructions: "You are a helpful weather assistant that provides accurate weather information.",
  model: "google/gemini-2.5-pro",
  tools: { weatherTool },
});
