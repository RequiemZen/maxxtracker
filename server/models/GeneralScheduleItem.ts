import mongoose, { Document, Schema } from 'mongoose';

interface IGeneralScheduleItem extends Document {
  user: Schema.Types.ObjectId;
  description: string;
  weekDays?: number[]; // 0-6, где 0 - воскресенье, 6 - суббота
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
  weekDays: {
    type: [Number],
    default: undefined, // Если не указано, значит пункт показывается на все дни
    validate: {
      validator: function (v: number[]) {
        return v.every(day => day >= 0 && day <= 6);
      },
      message: 'Week days must be numbers from 0 to 6'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const GeneralScheduleItem = mongoose.model<IGeneralScheduleItem>('GeneralScheduleItem', GeneralScheduleItemSchema);

export default GeneralScheduleItem; 