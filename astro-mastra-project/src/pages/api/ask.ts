import type { APIRoute } from 'astro';
import { mastra } from '../../mastra';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const message = body.message;

  const agent = mastra.getAgent("weather-agent");
  const result = await agent.generate(message);

  return new Response(JSON.stringify({ text: result.text }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
