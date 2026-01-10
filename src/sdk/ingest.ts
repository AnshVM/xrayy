import 'reflect-metadata';
import type { Stage, Candidate, ScoredCandidate, FilteredCandidate } from './types.js';
import type { Pipeline } from './pipeline.js';
import { sendPipeline } from './api.js';

type ParamCaptures = {
  index: number,
  name: string,
  type: 'any' | 'candidates'
}[];

// Parameter decorator - mark which params to capture
export function RawInput(name: string) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const captures = Reflect.getMetadata('xray:captures', target, propertyKey) || [];
    captures.push({
      index: parameterIndex,
      name,
      type: 'any'
    });
    Reflect.defineMetadata('xray:captures', captures, target, propertyKey);
  };
}



// Parameter decorator - mark a parameter as the candidates array (alias of RawInput)
export function Candidates(name: string) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const captures = Reflect.getMetadata('xray:captures', target, propertyKey) || [];
    captures.push({
      index: parameterIndex,
      name,
      type: 'candidates'
    });
    Reflect.defineMetadata('xray:captures', captures, target, propertyKey);
  };
}

export function validateAndConvertCandidateInput(input: any[], idField: string): Candidate[] {
  if (!Array.isArray(input)) {
    throw Error('Candidate input must be an array.');
  }

  if (idField != null && typeof idField !== 'string') {
    throw Error('idField must be a string when provided.');
  }

  return input.map((it: any, i: number) => {
    // Never treat items as pre-wrapped Candidate objects.
    // Always wrap the raw item and derive id from idField if present, otherwise use the index.
    let id: string | number = i;
    if (idField && it && typeof it === 'object' && idField in it) {
      id = (it as any)[idField];
    }

    return {
      candidate: it,
      id
    } as Candidate;
  });
}

export function validateAndConvertScoredCandidateInput(input: any[], idField: string, scoreField: string): ScoredCandidate[] {
  if (!Array.isArray(input)) {
    throw Error('Scored candidate input must be an array.');
  }

  if (typeof idField !== 'string' || typeof scoreField !== 'string') {
    throw Error('idField and scoreField must be strings.');
  }

  return input.map((it: any, i: number) => {
    // Always wrap the raw item as candidate and derive id from idField (fallback to index)
    let id: string | number = i;
    if (idField && it && typeof it === 'object' && idField in it) {
      id = (it as any)[idField];
    }

    // Extract and coerce score
    const rawScore = (it && typeof it === 'object' && scoreField in it) ? (it as any)[scoreField] : undefined;
    const score = Number(rawScore);
    if (Number.isNaN(score)) {
      throw Error(`Score field '${scoreField}' must be coercible to a number for item at index ${i}`);
    }

    return {
      candidate: it,
      id,
      score
    } as ScoredCandidate;
  });
}

export function validateAndConvertFilteredCandidates(
  input: any[],
  options: {
    passed: string,
    id: string,
    reasonLabelField?: string,
    reasonTextField?: string
  }
): Array<FilteredCandidate> {

  const {passed: passedField, id: idField, reasonLabelField, reasonTextField} =  options;

  if (!Array.isArray(input)) {
    throw Error('Filtered candidate input must be an array.');
  }

  if (typeof idField !== 'string' || idField.length === 0) {
    throw Error('idField must be a non-empty string.');
  }

  return input.map((it: any, i: number) => {
    // idField must be present on each returned item
    // if (!it || typeof it !== 'object' || !(idField in it)) {
    //   throw Error(`Filtered candidate is missing required idField '${idField}' at index ${i}`);
    // }
    if (!(idField in it)) {
      throw Error(`Filtered candidate is missing required idField '${idField}' at index ${i}`);
    }

    if (!(passedField in it)) {
      throw Error(`Filtered candidate is missing required passedField '${passedField}' at index ${i}`);
    }


    const id = it[idField];
    const passed = it[passedField]

    let reasonLabel: string | undefined = undefined;
    if (reasonLabelField) {
      if (!(reasonLabelField in it)) {
        throw Error(`No ${reasonLabelField} in Filtered candidate.`);
      }
      reasonLabel = it[reasonLabelField];
    }

    let reasonText: string | undefined = undefined;
    if (reasonTextField) {
      if (!(reasonTextField in it)) {
        throw Error(`No ${reasonTextField} in Filtered candidate.`);
      }
      reasonText = it[reasonTextField];
    }

    return {
      id,
      passed,
      reasonLabel,
      reasonText,
      candidate: it
    };
  });
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


      try {
        const output = await originalMethod.apply(this, args);
        const finishedAt = Date.now();

        const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];

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

        const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);
        throw err;
      }
    }

    return descriptor;
  }
}

export function RetrievalStage(label: string, options: { id: string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<Array<any>> {

      const capturedParams: ParamCaptures = Reflect.getMetadata('xray:captures', target, propertyKey) || [];
      let input: any = {};

      for (const capturedParam of capturedParams) {
        input[capturedParam.name] = args[capturedParam.index];
      }

      const startedAt = Date.now();

      try {
        const result: any[] = await originalMethod.apply(this, args);
        const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];
        const finishedAt = Date.now();

        if (!Array.isArray(result)) {
          throw Error('Output for Retrieval Stage must be an array.');
        }

        const candidates = validateAndConvertCandidateInput(result, options.id);

        const stage: Stage = {
          type: 'retrieval',
          label,
          status: 'success',
          startedAt,
          finishedAt,
          input: {
            any: input
          },
          output: {
            candidates
          }
        };

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);

        return result;
      } catch (err) {
        const finishedAt = Date.now();

        const stage: Stage = {
          type: 'retrieval',
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
            candidates: []
          }
        };

        const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);
        throw err;
      }
    }

    return descriptor;
  }
}


export function ScoringStage(label: string, options: { score: string; id: string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<ScoredCandidate[]> {

      const capturedParams: ParamCaptures = Reflect.getMetadata('xray:captures', target, propertyKey) || [];
      let input: any = {};

      for (const capturedParam of capturedParams) {
        input[capturedParam.name] = args[capturedParam.index];
      }

      const candidateParam = capturedParams.find(p => p.type === 'candidates');
      if (!candidateParam) {
        throw Error('Scoring stage must have Candidate parameter.');
      }
      const candidateParamIndex = candidateParam.index;

      const rawCandidates = args[candidateParamIndex];

      if (!options || typeof options.id !== 'string') {
        throw Error('ScoringStage requires an id field in options to convert inputs to Candidate.');
      }

      const convertedCandidates: Candidate[] = validateAndConvertCandidateInput(rawCandidates, options.id);

      const startedAt = Date.now();

      try {
        const result: any[] = await originalMethod.apply(this, args);
        const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];
        const finishedAt = Date.now();

        if (!Array.isArray(result)) {
          throw Error('Output for Scoring Stage must be an array.');
        }

        if (!options || typeof options.score !== 'string' || typeof options.id !== 'string') {
          throw Error('ScoringStage requires options with { score: string, id: string }');
        }

        // Normalize returned items to ScoredCandidate[]
        const scored: ScoredCandidate[] = validateAndConvertScoredCandidateInput(result, options.id, options.score);

        const stage: Stage = {
          type: 'scoring',
          label,
          status: 'success',
          startedAt,
          finishedAt,
          input: {
            candidates: convertedCandidates
          },
          output: {
            scoredCandidates: scored
          }
        };

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);

        return result;
      } catch (err) {
        const finishedAt = Date.now();

        const stage: Stage = {
          type: 'scoring',
          label,
          status: 'failure',
          error: {
            message: String(err)
          },
          startedAt,
          finishedAt,
          input: {
            candidates: convertedCandidates
          },
          output: {
            scoredCandidates: []
          }
        };

        const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);
        throw err;
      }
    }

    return descriptor;
  }
}

export function FilteringStage(label: string, options: { id: string, passed: string, reasonLabel?: string, reasonText?: string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const capturedParams: ParamCaptures = Reflect.getMetadata('xray:captures', target, propertyKey) || [];
      let input: any = {};

      for (const capturedParam of capturedParams) {
        if(capturedParam.type === 'candidates') continue;
        input[capturedParam.name] = args[capturedParam.index];
      }

      const candidateParam = capturedParams.find(p => p.type === 'candidates');
      if (!candidateParam) {
        throw Error('Filtering stage must have a Candidates parameter.');
      }

      const candidateParamIndex = candidateParam.index;
      const rawCandidates = args[candidateParamIndex];

      if (!options || typeof options.id !== 'string') {
        throw Error('FilteringStage requires an id field in options to convert inputs to Candidate.');
      }

      const convertedCandidates: Candidate[] = validateAndConvertCandidateInput(rawCandidates, options.id);

      const startedAt = Date.now();

      try {
        const result: any[] = await originalMethod.apply(this, args);
        const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];
        const finishedAt = Date.now();

        if (!Array.isArray(result)) {
          throw Error('Output for Filtering Stage must be an array.');
        }

        const filtered = validateAndConvertFilteredCandidates(result, options);

        const stage: Stage = {
          type: 'filtering',
          label,
          status: 'success',
          startedAt,
          finishedAt,
          input: {
            any: input,
            candidates: convertedCandidates
          },
          output: {
            filteredCandidates: filtered 
          }
        };

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);

        // Do not alter original return value
        return result;
      } catch (err) {
        const finishedAt = Date.now();

        const stage: Stage = {
          type: 'filtering',
          label,
          status: 'failure',
          error: {
            message: String(err)
          },
          startedAt,
          finishedAt,
          input: {
            any: input,
            candidates: convertedCandidates
          },
          output: {
            filteredCandidates: []
          }
        };

        const stages: Stage[] = Reflect.getMetadata('xray:stages', this.constructor) || [];

        stages.push(stage);

        Reflect.defineMetadata('xray:stages', stages, this.constructor);
        throw err;
      }
    };

    return descriptor;
  };
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


