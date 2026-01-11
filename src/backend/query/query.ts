import { PipelineModel } from "../db/pipeline/pipeline.js"
import { StageModel } from "../db/stage/stage.js"

export type NumericFieldQuery = number
  | { '$gt': number }
  | { '$lt': number }

export type QueryInputFilter = {
  pipeline?: {
    id?: string,
    label?: string

    startedAt?: NumericFieldQuery,
    finishedAt?: NumericFieldQuery,
    duration?: NumericFieldQuery
  }

  stage?: {
    type?: 'retrieval' | 'scoring' | 'filtering' | 'generation' | 'ranking' | 'raw';
    label?: string,

    startedAt?: NumericFieldQuery,
    finishedAt?: NumericFieldQuery,
    duration?: NumericFieldQuery,

    status?: 'success' | 'failure',

    $retrievalCount?: NumericFieldQuery;

    $filterInput?: NumericFieldQuery;
    $filterFailed?: NumericFieldQuery;
    $filterPassed?: NumericFieldQuery;
    $failRatio?: NumericFieldQuery;
    $passRatio?: NumericFieldQuery;

    $candidatesGenerated?: NumericFieldQuery;

    $highestScore?: NumericFieldQuery;
    $lowestScore?: NumericFieldQuery;
    $averageScore?: NumericFieldQuery;

    $inputLength?: NumericFieldQuery;
    $outputLength?: NumericFieldQuery;

    $averageRankShift?: NumericFieldQuery;
  }
}

export async function runQuery(queryInput: QueryInputFilter) {
  if (!queryInput.stage) {

    if (queryInput.pipeline) {
      const pipelines = await PipelineModel.aggregate([
        { $match: queryInput.pipeline },
        joinStages(),
        {$project: {
          'stages.input': -1,
          'stages.output': -1,
        }}
      ]);
      return pipelines;
    }

    // return all pipelines
    return PipelineModel.find();
  }

  let compiledStageFilter = compileStageFilter(queryInput.stage);

  console.log(compiledStageFilter);

  const stages = await StageModel.find(
    compiledStageFilter,
  );

  const pipelineIds = Array.from(
    new Set(
      stages.map(stage => stage.pipelineId)
    )
  );

  const pipelines = await PipelineModel.aggregate([
    {
      $match: {
        _id: { $in: pipelineIds },
        ...queryInput.pipeline
      }
    },
    joinStages(),
    {$project: {
      'stages.input': false,
      'stages.output': false
    }}
  ]);

  return pipelines;
}

function compileStageFilter(stageQueryInput: QueryInputFilter['stage']) {
  let compiled: any = {};

  if (!stageQueryInput) {
    return null;
  }

  for (const [key, value] of Object.entries(stageQueryInput)) {
    if (key[0] === '$') {
      compiled[`metadata.${key.slice(1)}`] = value;
      continue;
    }
    compiled[key] = value;
  }

  return compiled;
}

function joinStages() {
  return {
    $lookup: {
      from: 'stages',
      localField: '_id',
      foreignField: 'pipelineId',
      as: 'stages'
    }
  }
}

/* 
{
  sum: {
    stage: {
      label
      type
    } 
    field: 
  }
}
*/

