import 'reflect-metadata';
import { Entrypoint, Pipeline, RawInput, RawStage } from './sdk/ingest.js';

@Pipeline('somepipeline')
class SomePipeline {

  @Entrypoint()
  @RawStage('first')

  add(@RawInput('a') a: number, @RawInput('b') b: number) {
    return a + b;
  }
}

const pl = new SomePipeline();

pl.add(1,2);

