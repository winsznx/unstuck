import { handleMcpDelete, handleMcpGet, handleMcpOptions, handleMcpPost } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export function POST(request: Request): Promise<Response> {
  return handleMcpPost(request);
}

export function GET(request: Request): Response {
  return handleMcpGet(request);
}

export function DELETE(): Response {
  return handleMcpDelete();
}

export function OPTIONS(): Response {
  return handleMcpOptions();
}
