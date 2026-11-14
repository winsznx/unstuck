import { z } from "zod";

const env = z.object({
  DATABASE_URL: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(),
  REPLAY_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
  REPLAY_MEMORY: z.string().default("3g"),
  REPLAY_CPUS: z.string().default("2"),
});

export type Config = z.infer<typeof env>;

export const loadConfig = (): Config => env.parse(process.env);
