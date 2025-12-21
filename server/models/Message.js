import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    from_user_id: { type: String, ref: 'User', required: true },
    to_user_id: { type: String, ref: 'User', required: true },
    text: { type: String, trim: true },
    message_type: { type: String, enum: ['text', 'image']},
    media_url: { type: String},
    seen: { type: Boolean, default: false },
    deletedBy: { type: [String], ref: 'User', default: [] },
    reply_to_story: { type: String, ref: 'Story', default: null },
    reply_to_post: { type: String, ref: 'Post', default: null },
}, { timestamps: true, minimize: false });

const Message = mongoose.model('Message', messageSchema);

export default Message;