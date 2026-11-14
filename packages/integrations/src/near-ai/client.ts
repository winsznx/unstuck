import { z } from "zod";

export const NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1";
export const NEAR_AI_DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash";

export interface NearAiOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const completion = z.object({
  model: z.string(),
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }), finish_reason: z.string().nullable() })).min(1),
});

/** NEAR AI Cloud's OpenAI-compatible chat endpoint, used only for answers that must match a JSON schema. */
export class NearAi {
  readonly model: string;
  readonly #key: string;
  readonly #base: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: NearAiOptions) {
    if (!options.apiKey) throw new Error("NEAR AI needs an API key");
    this.#key = options.apiKey;
    this.model = options.model ?? NEAR_AI_DEFAULT_MODEL;
    this.#base = options.baseUrl ?? NEAR_AI_BASE_URL;
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 30_000;
  }

  /** Asks for an answer constrained to `jsonSchema`, then validates it with `parser` so a model that drifts still fails loudly. */
  async json<T>(messages: ChatMessage[], name: string, jsonSchema: object, parser: z.ZodType<T>): Promise<{ value: T; model: string }> {
    const response = await this.#fetch(`${this.#base}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.#key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: "json_schema", json_schema: { name, strict: true, schema: jsonSchema } },
      }),
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    if (!response.ok) throw new Error(`NEAR AI ${response.status}: ${(await response.text()).slice(0, 200)}`);
    const body = completion.parse(await response.json());
    const content = body.choices[0]?.message.content;
    if (!content) throw new Error(`NEAR AI returned no content (finish_reason ${body.choices[0]?.finish_reason ?? "none"})`);
    return { value: parser.parse(JSON.parse(content)), model: body.model };
  }
}
