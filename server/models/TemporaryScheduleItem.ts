import mongoose, { Document, Schema } from 'mongoose';

interface ITemporaryScheduleItem extends Document {
  user: Schema.Types.ObjectId;
  description: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

const TemporaryScheduleItemSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const TemporaryScheduleItem = mongoose.model<ITemporaryScheduleItem>('TemporaryScheduleItem', TemporaryScheduleItemSchema);

export default TemporaryScheduleItem; 