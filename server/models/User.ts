import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  username: string;
  password: string;
}

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

const User = mongoose.model<IUser>('User', UserSchema);

export default User; 