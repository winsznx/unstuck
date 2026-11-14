import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NearAi } from "./client";

const reply = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ok = (content: string | null) => reply({ model: "m", choices: [{ message: { content }, finish_reason: "stop" }] });
const parser = z.object({ n: z.number() });

describe("NearAi.json", () => {
  it("sends a strict json_schema request and returns the parsed answer", async () => {
    let sent: { url: string; init: RequestInit } | undefined;
    const fetchStub = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      return ok('{"n":3}')();
    }) as typeof fetch;
    const result = await new NearAi({ apiKey: "k", fetch: fetchStub }).json([{ role: "user", content: "x" }], "t", { type: "object" }, parser);
    expect(result).toEqual({ value: { n: 3 }, model: "m" });
    expect(sent?.url).toBe("https://cloud-api.near.ai/v1/chat/completions");
    const body = JSON.parse(String(sent?.init.body));
    expect(body.response_format.json_schema.strict).toBe(true);
    expect((sent?.init.headers as Record<string, string>).authorization).toBe("Bearer k");
  });

  it("fails on an HTTP error, empty content or an answer outside the schema", async () => {
    const call = (f: () => Promise<Response>) => new NearAi({ apiKey: "k", fetch: f as typeof fetch }).json([], "t", {}, parser);
    await expect(call(reply({ error: "no" }, 401))).rejects.toThrow(/NEAR AI 401/);
    await expect(call(ok(null))).rejects.toThrow(/no content/);
    await expect(call(ok('{"n":"three"}'))).rejects.toThrow();
  });

  it("refuses to start without a key", () => {
    expect(() => new NearAi({ apiKey: "" })).toThrow(/API key/);
  });
});
