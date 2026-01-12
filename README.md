# xrayy

### Tech stack
```Nodejs, MongoDB``

## Setup

1. Install dependencies:
```sh
   npm install
```

**You also need to have a running instance of MongoDB**

2. Create a `.env` file in the project root:
```env
   MONGODB_URI=mongodb://localhost:27017/xrayy
   XRAY_BACKEND=http://localhost:8000
```

3. Start the server with: 
 ```sh
 npm run server
 ```

4. Run the index script with:
```sh
npm run start
```

## Usage

### Capturing data

```typescript
@Pipeline('CompetitorSelectionPipeline', { id: 'id' })
class CompetitorSelectionPipeline {
  private catalog: Product[]
  private id: string;

  constructor(catalog: Product[], id: string) {
    this.catalog = catalog
    this.id = id;
  }
```

Annotate the class with `@Pipeline`
`@Pipeline(label: string, options: {id: string})`
Here options.id tells xray where to pick the pipeline id from.
In this case it is the id property of the class.

```typescript
  @Entrypoint()
  public async run(sellerProduct: Product): Promise<Product | null> {
  // ... do something
  }
```

Annotate the entrypoint method of your class with `@Entrypoint()`

```typescript
  @RankingStage('llm-re-rank-candidates', { id: 'id' })
  private llmReRankCandidates(
    @RawInput('product') seller: Product,
    @Candidates('candidates') candidates: Product[]
  ): RankedProduct[] {
    return candidates
      .map(p => ({
        ...p,
        relevanceScore: this.simulateLLMRelevanceScore(seller, p)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }
```

Annotate methods and their params with decorators.
In the above example we have used the `@RankingStage` decorator.
`@RankingStage(label: string, {id: 'id'})`
The `options.id` tells xray which field will have the candidate id 
in the input and output array of candidates.

Some stages have some restrictions
For RankingStage:
1. Must return an array
2. Must have one input annotated with `@Candidates('somelabel')` which should be an array.

`@FilteringStage(label: stirng, options: { id: string, passed: string , reasonLabel?: string, reasonText?: string})`
Requires: 
1. Atleast one param annotated with @Candidates which should be array.
2. Must return an array with the id and passed field, passed in options.

`@GenerationStage(label: string, {reason?: string})`
1. Output must be an array
2. If reason field is specified, each output item must have it.


`@RetrievalStage(label: string, { id: string })`
1. Output must be an array with each item having the id field passed in the options.

`ScoringStage(label: string, options: { score: string; id: string })`
1. Ateast one param with @Candidates of type array having the id field passed in options.
2. Output must be of type array, each item having the score field passed in the array.

`@RawInput(label: string)`
1. No restrictions

`@RawInput(label: string)`
1. Can be used to capture any param.

### Querying
```typescript
import {runQuery} from './sdk/api.js'

const results = await runQuery({
   pipeline: {
      id: 'pipelin_0001'
   }
})
```

```typescript
const result = await runQuery({
  pipeline: {
    label: 'CompetitorSelectionPipeline'
  },
  stage: {
    type: 'retrieval',
    $retrievalCount: 6
  }
})
```

```typescript
const result = await runQuery({
  stage: {
    $retrievalCount: { $gt: 6 }
  }
})
```

Query Input Type 
```typescript
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
```


### Limitations
1. Cannot query over the input output data itself, only the metadata