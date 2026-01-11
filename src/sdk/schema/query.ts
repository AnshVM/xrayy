export type NumericFieldQuery = number 
| {'$gt': number} 
| {'$lt': number}

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