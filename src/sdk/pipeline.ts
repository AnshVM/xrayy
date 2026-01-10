import type { Stage } from "./types.js";

export interface Pipeline {
  label: string;
  startedAt: number;
  finishedAt: number;

  status: 'success' | 'failure'

  error?: {
    message?: string,
    code?: string
  }

  stages: Stage[]
}