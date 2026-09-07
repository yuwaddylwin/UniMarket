import mongoose from 'mongoose';
const ref = (model) => ({ type: mongoose.Schema.Types.ObjectId, ref: model });
const base = {
  adminId: ref('User'), userId: { ...ref('User'), required: true },
  reason: { type: String, required: true, maxlength: 2000 },
  adminNote: { type: String, maxlength: 2000, default: '' },
};
const warning = new mongoose.Schema(base, { timestamps: true });
warning.index({ userId: 1, createdAt: -1 });
const restriction = new mongoose.Schema({ ...base,
  kind: { type: String, enum: ['frozen', 'suspended'], required: true },
  until: Date, endedAt: Date, endedBy: ref('User'),
}, { timestamps: true });
restriction.index({ userId: 1, createdAt: -1 });
const audit = new mongoose.Schema({
  adminId: ref('User'), action: { type: String, required: true },
  userId: ref('User'), listingId: mongoose.Schema.Types.ObjectId, listingType: String,
  reportId: ref('UserReport'), reason: { type: String, required: true, maxlength: 2000 },
  adminNote: { type: String, maxlength: 2000, default: '' },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });
audit.index({ createdAt: -1 });
audit.index({ userId: 1, createdAt: -1 });
for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete']) audit.pre(operation, function () { throw new Error('Moderation history is append-only'); });
audit.pre('save', function () { if (!this.isNew) throw new Error('Moderation history is append-only'); });
export const Warning = mongoose.model('Warning', warning);
export const Restriction = mongoose.model('AccountRestriction', restriction);
export const ModerationAction = mongoose.model('ModerationAction', audit);
