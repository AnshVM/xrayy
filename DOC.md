# xrayy — Ingest SDK

This repository contains a small SDK to instrument pipeline stages using TypeScript decorators. The SDK captures stage inputs and outputs and builds a pipeline metadata object which can be sent to a backend for storage or analysis.

This doc explains the basic concepts and shows how to use the decorators. See `src/index.ts` for a concise example.

## Concepts

- Pipeline: annotate a class with `@Pipeline('label')`. The SDK records a pipeline label and all stages executed by the class.
- Entrypoint: mark the pipeline entry method with `@Entrypoint()`. When that method finishes the SDK assembles the pipeline metadata and calls the configured sender (`sendPipeline`).
- RawStage: `@RawStage(label)` wraps a method and records raw input/output (any shape) as a stage.
- RetrievalStage: `@RetrievalStage(label, { id: 'idField' })` expects the method to return an array. The SDK converts the array to `Candidate[]` (wraps items with `{ candidate, id }`) and records the stage output as `candidates`.
- Candidates parameter decorator: `@Candidates('name')` marks which argument is the candidates array for stages such as scoring/filtering.
- ScoringStage: `@ScoringStage(label, { score: 'scoreField', id: 'idField' })` expects the decorated method to return an array of items containing the score and id fields specified in options. The SDK records `scoredCandidates` in the stage metadata but preserves the original method return value.
- FilteringStage: `@FilteringStage(label, { id: 'idField', reasonLabel?: 'field', reasonText?: 'field' })` expects the decorated method to return an array of items representing the filtered output. The SDK records `filteredCandidates` (with `passed` boolean and optional reason fields) and preserves the original return value.

## Types

- Candidate: `{ candidate: any; id: string | number }`
- FilteredCandidate: `{ id: string|number; candidate: any; passed: boolean; reasonLabel?: string; reasonText?: string }`
- ScoredCandidate: `{ id: string|number; candidate: any; score: number }`
- Stage: recorded stage metadata includes `type`, `label`, `status`, `startedAt`, `finishedAt`, `input`, `output`, `metadata`.

## Minimal example

See `src/index.ts`. A short version:

```ts
import 'reflect-metadata';
import { Pipeline, Entrypoint, RawStage, RawInput, RetrievalStage, Candidates, ScoringStage, FilteringStage } from './sdk/ingest.js';

@Pipeline('example')
class MyPipeline {
	@Entrypoint()
	async run() {
		const sum = await this.add(1,2);
		const candidates = await this.retrieve(sum);
		const scored = await this.score(candidates);
		const filtered = await this.filter(scored);
		return filtered;
	}

	@RawStage('add')
	add(@RawInput('a') a:number, @RawInput('b') b:number) {
		return a + b;
	}

	@RetrievalStage('retrieve', { id: 'id' })
	retrieve(@RawInput('a') a:number) {
		return ['doc1','doc2'];
	}

	@ScoringStage('score', { score: 's', id: 'id' })
	score(@Candidates('candidates') candidates:any[]) {
		// return array of objects containing 's' and 'id'
		return candidates.map((c, i) => ({ id: c.id, s: Math.random(), candidate: c }));
	}

	@FilteringStage('filter', { id: 'id', reasonLabel: 'label', reasonText: 'text' })
	filter(@Candidates('candidates') candidates:any[]) {
		// return array of items representing the filtered output (e.g. only those kept)
		return candidates.filter((c:any) => c.s > 0.5).map(c => ({ id: c.id, label: 'kept', text: 'passed' }));
	}
}

const p = new MyPipeline();
p.run();
```

## Backend

The SDK's `sendPipeline` function looks for an env var `XRAY_BACKEND`. If present it will POST pipeline metadata to `${XRAY_BACKEND}/ingest`. Otherwise it prints the pipeline JSON to stdout.

## Extending

- You can add more stage decorators following the existing patterns in `src/sdk/ingest.ts`.
- The backend schema and stage model live under `src/backend/db/*`.

## Running

1. Install dependencies: `npm install` (will install express, mongoose, etc.)
2. Build: `npm run build`
3. Run: `npm start`

## Notes

- Decorators preserve the original return values of methods; conversions are only used to build stage metadata.
- The SDK assumes a stable `id` field for candidates. If you don't have an id, consider generating a stable fingerprint before returning candidates.

