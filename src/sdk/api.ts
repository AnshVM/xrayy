import dotenv from 'dotenv';
import type { Pipeline } from "./pipeline.js";

dotenv.config();

const XRAY_BACKEND = process.env.XRAY_BACKEND;

export async function sendPipeline(pipeline: Pipeline) {
  console.log(pipeline)
  // If backend not configured, fall back to stdout
  if (!XRAY_BACKEND) {
    throw Error('Please confiture XRAY_BACKEND in .env.');
  }

  const url = `${XRAY_BACKEND}/ingest`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pipeline)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`sendPipeline failed: ${res.status} ${res.statusText} - ${text}`);
    }
  } catch (err) {
    console.error('sendPipeline error:', String(err));
  }
}
