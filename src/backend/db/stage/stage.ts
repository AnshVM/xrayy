import mongoose, { Schema, Types, Document } from 'mongoose';

export type Candidate = {
  candidate: any;
};

export type FilteredCandidate = {
  candidate: any;
  passed: boolean;
  reasonLabel?: string;
  reasonText?: string;
};

export type ScoredCandidate = {
  candidate: any;
  score: number;
};

export interface StageDocument extends Document {
  type: 'retrieval' | 'scoring' | 'filtering' | 'generation' | 'raw';

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
    json?: any;
    str?: string;
    num?: number;
    bool?: boolean;
    candidates?: Candidate[];
  };

  output: {
    json?: any;
    str?: string;
    num?: number;
    bool?: boolean;

    candidates?: Candidate[];

    filteredCandidates?: FilteredCandidate[];

    scoredCandidates?: ScoredCandidate[];

    generatedCandidates?: {
      candidate: any;
      reasonText?: string;
    }[];
  };
  metadata: {
    retrievalCount?: number;

    filteringInputCount?: number;
    filteringOutputCount?: number;
    filteringRatio?: number;

    generationModel?: string;
    tokensUsed?: number;
    prompt?: string;
    candidatesGenerated?: number;

    highestScore?: number;
    lowestScore?: number;
    medianScore?: number;

    inputLength?: number;
    outputLength?: number;
  };
}

const StageSchema = new Schema<StageDocument>({
  type: { type: String, required: true, enum: ['retrieval', 'scoring', 'filtering', 'generation', 'raw'], index: true },

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
    json: Schema.Types.Mixed,
    str: String,
    num: Number,
    bool: Boolean,
    candidates: [{ candidate: Schema.Types.Mixed }],
  },

  output: {
    json: Schema.Types.Mixed,
    str: String,
    num: Number,
    bool: Boolean,

    candidates: [{ candidate: Schema.Types.Mixed }],

    filteredCandidates: [{
      candidate: Schema.Types.Mixed,
      passed: Boolean,
      reasonLabel: String,
      reasonText: { type: String, index: true },
    }],

    scoredCandidates: [{
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
    filteringInputCount: { type: Number, index: true },
    filteringOutputCount: { type: Number, index: true },
    filteringRatio: { type: Number, index: true },

    // for generation stages
    generationModel: { type: String, index: true },
    tokensUsed: { type: Number, index: true },
    prompt: { type: String, index: true },
    candidatesGenerated: { type: Number, index: true },
    
    // for scoring stages
    highestScore: { type: Number, index: true },
    lowestScore: { type: Number, index: true },
    medianScore: { type: Number, index: true },

    inputLength: { type: Number, index: true },
    outputLength: { type: Number, index: true },
  },
});

export const StageModel = mongoose.model<StageDocument>('Stage', StageSchema);
