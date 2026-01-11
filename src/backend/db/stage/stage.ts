import mongoose, { Schema, Types, Document } from 'mongoose';

export type Candidate = {
  candidate: any;
  id: string | number;
};

export type FilteredCandidate = {
  id: string | number;
  candidate: any;
  passed: boolean;
  reasonLabel: string | undefined;
  reasonText: string | undefined;
};

export type ScoredCandidate = {
  id: string | number;
  candidate: any;
  score: number;
};

export type GeneratedCandidate = {
  candidate: any;
  reasonText: string | undefined;
}

export type Stage = {
  type: 'retrieval' | 'scoring' | 'filtering' | 'generation' | 'ranking' | 'raw';

  pipelineId: Types.ObjectId;

  label: string;

  status: 'success' | 'failure';

  error?: {
    message?: string;
    code?: string;
  };

  startedAt: number;
  finishedAt: number;
  duration: number;

  input: {
    any?: any,
    candidates?: Candidate[];
  };

  output: {
    any?: any,

    candidates?: Candidate[];

    filteredCandidates?: FilteredCandidate[];

    scoredCandidates?: ScoredCandidate[];

    generatedCandidates?: GeneratedCandidate[];
  };
  metadata: {
    retrievalCount?: number;

    filterInput?: number;
    filterFailed?: number;
    filterPassed?: number;
    failRatio?: number;
    passRatio?: number;

    generationModel?: string;
    tokensUsed?: number;
    prompt?: string;
    candidatesGenerated?: number;

    highestScore?: number;
    lowestScore?: number;
    averageScore?: number;

    inputLength?: number;
    outputLength?: number;

    averageRankShift?: number;
  };
}

const StageSchema = new Schema<Stage>({
  type: {
    type: String,
    required: true,
    enum: ['retrieval', 'scoring', 'filtering', 'generation', 'ranking', 'raw'],
    index: true
  },

  pipelineId: { type: Types.ObjectId, required: true, index: true },

  label: { type: String, required: true, index: true },

  status: { type: String, required: true, enum: ['success', 'failure'], index: true },

  error: {
    message: { type: String },
    code: { type: String, index: true },
  },

  startedAt: { type: Number, required: true, index: true },
  finishedAt: { type: Number, required: true, index: true },
  duration: { type: Number, required: true, index: true },

  input: {
    any: Schema.Types.Mixed,
    candidates: [{
      candidate: Schema.Types.Mixed,
      id: {
        type: Schema.Types.Union,
        of: [Number, String],
      }
    }],
  },

  output: {
    any: Schema.Types.Mixed,

    candidates: [{
      candidate: Schema.Types.Mixed,
      id: {
        type: Schema.Types.Union,
        of: [Number, String],
      }
    }],

    filteredCandidates: [{
      id: {
        type: Schema.Types.Union,
        of: [Number, String],
      },
      candidate: Schema.Types.Mixed,
      passed: Boolean,
      reasonLabel: String,
      reasonText: { type: String, index: true },
    }],

    scoredCandidates: [{
      id: {
        type: Schema.Types.Union,
        of: [Number, String],
      },
      candidate: Schema.Types.Mixed,
      score: { type: Number, index: true },
    }],

    generatedCandidates: [{
      candidate: Schema.Types.Mixed,
      reasonText: String,
    }],
  },

  metadata: {
    // for retrieval stage
    retrievalCount: { type: Number, index: true },

    // for filtering stage
    // for filtering stage (new fields)
    filterInput: { type: Number, index: true },
    filterFailed: { type: Number, index: true },
    filterPassed: { type: Number, index: true },
    failRatio: { type: Number, index: true },
    passRatio: { type: Number, index: true },

    // for generation stages
    generationModel: { type: String, index: true },
    tokensUsed: { type: Number, index: true },
    prompt: { type: String, index: true },
    candidatesGenerated: { type: Number, index: true },

    // for scoring stages
    highestScore: { type: Number, index: true },
    lowestScore: { type: Number, index: true },
    averageScore: { type: Number, index: true },

    inputLength: { type: Number, index: true },
    outputLength: { type: Number, index: true },

    // for ranking stage
    averageRankShift: { type: Number, index: true },
  },
});

export const StageModel = mongoose.model<Stage>('Stage', StageSchema);
