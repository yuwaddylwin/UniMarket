import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conversationId: { type: String, required: true },
  reason: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
}, { timestamps: true });
schema.index({ reporterId: 1, reportedId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
export default mongoose.model('UserReport', schema);
