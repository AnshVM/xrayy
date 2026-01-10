import 'reflect-metadata';
import { Entrypoint, Pipeline, RawInput, RawStage, RetrievalStage } from './sdk/ingest.js';

@Pipeline('somepipeline')
class SomePipeline {

  @Entrypoint()
  entrypoint() {
    const a = this.add(1,2);
    this.retrieve(a);
  }


  @RawStage('first')
  add(@RawInput('a') a: number, @RawInput('b') b: number) {
    return a + b;
  }

  @RetrievalStage('retrieve')
  retrieve(@RawInput('a') a: number): string[] {
    return [
      'some document',
      'another document'
    ]
  }
}

const pl = new SomePipeline();


pl.entrypoint();


