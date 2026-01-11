import mongoose, { Schema, Document } from 'mongoose';

export interface PipelineDocument extends Document {
  id: string; // separate from _id
  label: string;

  status: 'success' | 'failure';

  error?: {
    message?: string,
    code?: string
  }

  startedAt: number;
  finishedAt: number;
  duration: number;
}

const PipelineSchema = new Schema<PipelineDocument>({
  id: { type: String, required: true, unique: true, index: true },
  label: { type: String, required: true, index: true },
  status: { type: String, required: true, enum: ['success', 'failure'], index: true },
  error: {
    message: { type: String },
    code: { type: String, index: true },
  },
  startedAt: { type: Number, required: true, index: true },
  finishedAt: { type: Number, required: true, index: true },
  duration: { type: Number, required: true, index: true },
});

export const PipelineModel = mongoose.model<PipelineDocument>('Pipeline', PipelineSchema);
