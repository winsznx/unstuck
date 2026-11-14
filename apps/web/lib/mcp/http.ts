import "server-only";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createUnstuckMcpServer } from "./unstuck-server";

export const SETUP_GUIDE_PATH = "/docs/agents";

// Public and credential-free, so any origin may call it, browser-based MCP clients included.
export const CORS_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** Stateless Streamable HTTP with JSON responses: one server and transport per request, and no session to keep. */
export async function handleMcpPost(request: Request): Promise<Response> {
  const server = createUnstuckMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    return withCors(await transport.handleRequest(request));
  } finally {
    await server.close();
  }
}

/** There's no stream for server-initiated messages, which the spec answers with 405. A browser gets the setup guide. */
export function handleMcpGet(request: Request): Response {
  if ((request.headers.get("accept") ?? "").includes("text/html")) return new Response(null, { status: 302, headers: { Location: SETUP_GUIDE_PATH } });
  return withCors(Response.json({ error: "This MCP server uses Streamable HTTP without a GET stream. Send JSON-RPC messages with POST." }, { status: 405, headers: { Allow: "POST, OPTIONS" } }));
}

export const handleMcpDelete = (): Response => withCors(new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS" } }));

export const handleMcpOptions = (): Response => new Response(null, { status: 204, headers: CORS_HEADERS });
