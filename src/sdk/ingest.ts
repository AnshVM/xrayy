import 'reflect-metadata';
import type { Stage } from './types.js';
import type { Pipeline } from './pipeline.js';
import { sendPipeline } from './api.js';

type ParamCaptures = {
  index: number,
  name: string
}[];

// Parameter decorator - mark which params to capture
export function RawInput(name: string) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const captures = Reflect.getMetadata('xray:captures', target, propertyKey) || [];
    captures.push({
      index: parameterIndex,
      name
    });
    Reflect.defineMetadata('xray:captures', captures, target, propertyKey);
  };
}

export function RawStage(label: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const capturedParams: ParamCaptures = Reflect.getMetadata('xray:captures', target, propertyKey) || [];
      let input: any = {};

      for (const capturedParam of capturedParams) {
        input[capturedParam.name] = args[capturedParam.index];
      }

      const startedAt = Date.now();

      const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];

      try {
        const output = await originalMethod.apply(this, args);
        const finishedAt = Date.now();

        const stage: Stage = {
          type: 'raw',
          label,
          status: 'success',
          startedAt,
          finishedAt,
          input: {
            any: input
          },
          output: {
            any: output
          }
        };

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);

        return output;
      } catch (err) {
        const finishedAt = Date.now();

        const stage: Stage = {
          type: 'raw',
          label,
          status: 'failure',
          error: {
            message: String(err)
          },
          startedAt,
          finishedAt,
          input: {
            any: input
          },
          output: {
            any: null
          }
        };

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);
        throw err;
      }
    }

    return descriptor;
  }
}

export function Entrypoint() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startedAt = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const finishedAt = Date.now();

        const label = Reflect.getMetadata('xray:pipeline_label', this.constructor);
        const stages = Reflect.getMetadata('xray:stages', this.constructor);

        const pipeline: Pipeline = {
          label,
          startedAt,
          finishedAt,
          status: 'success',
          stages
        }

        await sendPipeline(pipeline);

        return result;
      } catch (err) {
        const finishedAt = Date.now();
        const label = Reflect.getMetadata('xray:pipeline_label', this.constructor);
        const stages = Reflect.getMetadata('xray:stages', this.constructor);

        const pipeline: Pipeline = {
          label,
          startedAt,
          finishedAt,
          status: 'failure',
          stages,
          error: {
            message: String(err)
          }
        }

        await sendPipeline(pipeline);

        throw err;
      }
    }
    return descriptor;
  }
}

export function Pipeline(label: string) {
  return function (constructor: Function) {
    Reflect.defineMetadata('xray:pipeline_label', label, constructor);
  }
}


