import dotenv from 'dotenv';
import type { Pipeline } from "./schema/pipeline.js";
import type { QueryInputFilter } from './schema/query.js';

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



export async function runQuery(query: QueryInputFilter) {
  const url = `${XRAY_BACKEND}/query`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`runQuery failed: ${res.status} ${res.statusText}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (err) {
    console.error('runQuery error:', String(err));
    throw err;
  }
}