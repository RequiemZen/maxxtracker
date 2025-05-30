import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  username: string;
}

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
});

const User = mongoose.model<IUser>('User', UserSchema);

export default User; 