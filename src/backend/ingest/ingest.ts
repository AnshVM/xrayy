import type { Types } from "mongoose";
import { StageModel, type Stage, } from "../db/stage/stage.js";
import type { Candidate, FilteredCandidate, GeneratedCandidate, PipelineRequestInput, StageRequestInput } from "./request.types.js";
import { PipelineModel, type Pipeline } from "../db/pipeline/pipeline.js";

export async function ingestPipeline(pipelineInput: PipelineRequestInput) {
  const pipeline = processMetadata(pipelineInput);
 
  const savedPipeline = await PipelineModel.insertOne(pipeline)

  const stages = pipelineInput.stages.map(stageInput => {
    return processStageMetadata(stageInput, savedPipeline._id);
  });

  await StageModel.insertMany(stages);
}

export function processMetadata(pipelineInput: PipelineRequestInput) {
  const duration = pipelineInput.finishedAt - pipelineInput.startedAt;
  const pipeline: Pipeline = {...pipelineInput, duration};
  
  return pipeline;
}


export function processStageMetadata(stageInput: StageRequestInput, piplineId: Types.ObjectId) {
  const stage: Stage = {
    ...stageInput,
    pipelineId: piplineId,
    duration: stageInput.finishedAt - stageInput.startedAt,
    metadata: {}
  };

  switch (stage.type) {
    case 'retrieval':
      retrievalMetadata(stage)    // Process retrieval stage metadata
      break;
    case 'scoring':
      scoringMetadata(stage)      // Process scoring stage metadata
      break;
    case 'filtering':
      filteringMetadata(stage)         // Process filtering stage metadata
      break;
    case 'generation':
      generationMetadata(stage)       // Process generation stage metadata
      break;
    case 'ranking':
      rankingMetadata(stage);
      break;
    case 'raw':
      break;
  }

  return stage;
}

function retrievalMetadata(stage: Stage) {
  const candidates = stage.output.candidates;

  const metadata: Stage['metadata'] = {
    retrievalCount: candidates ? candidates.length : 0,
  };

  stage.metadata = metadata;
}

function scoringMetadata(stage: Stage) {
  const candidates = stage.output.scoredCandidates;

  const scores = candidates?.map(candidate => candidate.score);

  if (!scores || scores.length === 0) {
    return;
  }

  const sorted = scores.sort((a, b) => a - b);
  const len = sorted.length;
  const min = sorted[0];
  const max = sorted[len - 1];

  const avg = sorted.reduce((sum: number, score: number) => sum + score, 0) / sorted.length;

  const metadata = {
    higestScore: max as number,
    lowestScore: min as number,
    averageScore: avg as number
  }

  stage.metadata = metadata;
}

function filteringMetadata(stage: Stage) {
  const input = stage.input.candidates as Candidate[];
  const output = stage.output.filteredCandidates as FilteredCandidate[];

  const filterFailed = output.filter(candidate => !candidate.passed).length;
  const filterPassed = input.length - filterFailed; 

  const failRatio = filterFailed / input.length;
  const passRatio = filterPassed / input.length;

  const metadata = {
    filterInput: input.length,
    filterFailed,
    filterPassed,
    failRatio,
    passRatio
  }

  stage.metadata = metadata;
}

function generationMetadata(stage: Stage) {
  const output = stage.output.generatedCandidates as GeneratedCandidate[];

  const candidatesGenerated = output.length;

  const metadata = {
    candidatesGenerated 
  }

  stage.metadata = metadata; 
}

function rankingMetadata(stage: Stage) {
  const input = stage.input.candidates as Candidate[];
  const output = stage.output.candidates as Candidate[];

  const inputIds = input.map(candidate => candidate.id);
  const outputIds = output.map(candidate => candidate.id);

  const averageRankShift = getAverageRankShift(inputIds, outputIds);

  const metadata = {
    averageRankShift
  }

  stage.metadata = metadata;
}


export function getAverageRankShift(idsA: Array<string|number>, idsB: Array<string|number>): number {
  const setB = new Set(idsB);
  // build rank maps
  const rankA = new Map<string|number, number>();
  const rankB = new Map<string|number, number>();
  idsA.forEach((id, i) => rankA.set(id, i + 1));
  idsB.forEach((id, i) => rankB.set(id, i + 1));

  const intersection: (string|number)[] = idsA.filter(id => setB.has(id));
  const n = intersection.length;
  if (n === 0) {
    const unionSize = new Set([...idsA, ...idsB]).size;
    return unionSize === 0 ? 0 : 1;
  }

  let S = 0;
  for (const id of intersection) {
    S += Math.abs((rankA.get(id) || 0) - (rankB.get(id) || 0));
  }

  const avgShift = S / n;
  return n <= 1 ? 0 : Math.min(1, avgShift / (n - 1));
}