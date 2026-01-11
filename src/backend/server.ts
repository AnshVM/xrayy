import express from 'express';
import dotenv from 'dotenv';
import { ingestPipeline } from './ingest/ingest.js';
import { initDbConn } from './db/db.js';
import { runQuery } from './query/query.js';

dotenv.config();

const app = express();
app.use(express.json());

await initDbConn();

app.post('/ingest', async (req, res) => {
  console.log('received /ingest', req.body);
  await ingestPipeline(req.body);
  res.status(200).json({ ok: true });
});

app.post('/query', async(req, res) => {
  const query = req.body;
  const pipelines = await runQuery(query);
  res.status(200).json({pipelines});
})

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
