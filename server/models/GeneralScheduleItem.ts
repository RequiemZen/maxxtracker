import mongoose, { Document, Schema } from 'mongoose';

interface IGeneralScheduleItem extends Document {
  user: Schema.Types.ObjectId;
  description: string;
  createdAt: Date;
}

const GeneralScheduleItemSchema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const GeneralScheduleItem = mongoose.model<IGeneralScheduleItem>('GeneralScheduleItem', GeneralScheduleItemSchema);

export default GeneralScheduleItem; 