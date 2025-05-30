import mongoose, { Document, Schema } from 'mongoose';

interface IScheduleItem extends Document {
  user: Schema.Types.ObjectId;
  description: string;
  date: Date;
  status?: string;
  createdAt: Date;
}

const ScheduleItemSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
    required: false,
    enum: ['completed', 'not_completed'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ScheduleItem = mongoose.model<IScheduleItem>('ScheduleItem', ScheduleItemSchema);

export default ScheduleItem; 