import mongoose, { Document, Schema } from 'mongoose';

interface IScheduleItem extends Document {
  user: Schema.Types.ObjectId;
  definitionId: Schema.Types.ObjectId;
  description: string;
  date: Date;
  status?: string;
  reason?: string;
  createdAt: Date;
}

const ScheduleItemSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  definitionId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['completed', 'not_completed'],
    required: false,
  },
  reason: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ScheduleItem = mongoose.model<IScheduleItem>('ScheduleItem', ScheduleItemSchema);

export default ScheduleItem; 