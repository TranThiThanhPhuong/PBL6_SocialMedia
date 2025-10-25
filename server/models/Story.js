import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    user: { type: String, ref: 'User', required: true },
    image_urls: [{ type: String }],
    content: { type: String, default: "" }, 
    post_type: { type: String, enum: ['text', 'image'], required: true},
    likes_count: [{ type: String, ref: 'User' }],
    views_count: [{ type: String, ref: 'User' }],
    background_color: { type: String }
}, {timestamps: true, minimize: false});

const Story = mongoose.model('Story', storySchema);

export default Story;