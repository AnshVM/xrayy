export type Candidate = {
  candidate: any;
  id: string | number;
};

export type FilteredCandidate = {
  candidate: any;
  id: string | number;
  passed: boolean;
  reasonLabel: string | undefined;
  reasonText: string | undefined;
};

export type ScoredCandidate = {
  candidate: any;
  id: string | number;
  score: number;
};

export type GeneratedCandidate = {
  candidate: any;
  reasonText: string | undefined;
}

export interface Stage {
  type: 'retrieval' | 'scoring' | 'filtering' | 'generation' | 'ranking' | 'raw';

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

    generatedCandidates?: GeneratedCandidate[];
  }
}