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

export interface Stage {
  type: 'retrieval' | 'scoring' | 'filtering' | 'generation' | 'raw';

  label: string;

  status: 'success' | 'failure';

  error?: {
    message?: string;
    code?: string;
  };

  startedAt: number;
  finishedAt: number;

  input: {
    any?: any;
    candidates?: Candidate[];
  };

  output: {
    any?: any;

    candidates?: Candidate[];

    filteredCandidates?: FilteredCandidate[];

    scoredCandidates?: ScoredCandidate[];

    generatedCandidates?: {
      candidate: any;
      reasonText?: string;
    }[];
  };
}