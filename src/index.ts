import 'reflect-metadata';
import { Candidates, Entrypoint, FilteringStage, GenerationStage, Pipeline, RankingStage, RawInput, RawStage, RetrievalStage, ScoringStage } from './sdk/ingest.js';
import { pipeline } from 'node:stream';
import { runQuery } from './sdk/api.js';

@Pipeline('somepipeline', {id: 'id'})
class SomePipeline {

  id: string;

  constructor(id: string) {
    this.id = id;
  }

  @Entrypoint()
  async entrypoint() {
    const a = await this.add(1,2);
    const candidates = await this.retrieve(a);
    const scored = await this.score(candidates as any[]);
    const ranked = await this.ranking(scored);
    return ranked;
    // const filtered = await this.filter(scored);
    // const gen = this.generation(filtered);
    // console.log('scored', scored);
  }


  @RawStage('first')
  add(@RawInput('a') a: number, @RawInput('b') b: number) {
    return a + b;
  }

  @RetrievalStage('retrieve', {id: 'id'})
  retrieve(@RawInput('a') a: number): {id: number, document: string}[] {
    return [
      {
        id:1,
        document: 'some document',
      },
      {
        id: 2,
        document: 'another document',
      }
    ]
  }

  @ScoringStage('score', { score: 'scorefield', id: 'id' })
  score(@Candidates('candidates') candidates: any[]) {
    // Dummy scoring: return an array with the specified id and score field names
    return (candidates || []).map((c: any, i: number) => {
      return {
        id: c.id,
        scorefield: Math.round(Math.random() * 100) / 100,
        document: c.document,
      };
    });
  }

  @FilteringStage('filter', {id: 'id', passed: 'passed', reasonLabel: 'reason' })
  filter(@Candidates('candidates') candidates: {id: number, scorefield: number, document: string}[]) {
    return candidates.map(candidate => {
      return {
        id: candidate.id,
        scoreField: candidate.scorefield,
        document: candidate.document,
        passed: candidate.scorefield > 0.5,
        reason: candidate.scorefield > 0.5 ? 'high enough' : 'very low'
      }
    }) 
  }

  @GenerationStage('generation', {reason: 'reason'})
  generation(@RawInput('candidates') candidates: {document: string, reason: string}[]) {
    return candidates;
  }

  @RankingStage('ranking', {id: 'id'}) 
  ranking(@Candidates('candidates') candidates: any[]) {
    return candidates;
  }
}

const pipelines = await runQuery(
  {
    stage: {
      type: 'retrieval',
      $retrievalCount: 3
    }
  }
)

console.log(JSON.stringify(pipelines,null,2));

