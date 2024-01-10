const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PostSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    desc: {
      type: String,
      max: 500,
    },
    img: {
      type: String,
    },
    likes: {
      type: Array,
      default: [],
    },
    tags: {
      type: [Object],
      default: [],
    },
    comments: [CommentSchema], // Use the CommentSchema here
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
