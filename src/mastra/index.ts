import { Mastra } from "@mastra/core";
import { symbologyAgent } from "./agent";

export const mastra = new Mastra({
	agents: { symbologyAgent },
});
