import type { Pipeline } from "./pipeline.js";

export async function sendPipeline(pipeline: Pipeline) {
  console.log(JSON.stringify(pipeline, null, 2));
}
