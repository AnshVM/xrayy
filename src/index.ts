import 'reflect-metadata';
import { Candidates, Entrypoint, Pipeline, RawInput, RawStage, RetrievalStage, ScoringStage } from './sdk/ingest.js';

@Pipeline('somepipeline')
class SomePipeline {

  @Entrypoint()
  async entrypoint() {
    const a = await this.add(1,2);
    const candidates = await this.retrieve(a);
    const scored = await this.score(candidates as any[]);
    console.log('scored', scored);
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
}

const pl = new SomePipeline();


pl.entrypoint();


