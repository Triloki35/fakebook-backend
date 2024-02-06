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
    type: Buffer,
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
    username: {
      type: String,
      require: true,
    },
    profilePicture: {
      type: Buffer,
    },
    desc: {
      type: String,
      max: 500,
    },
    img: {
      type: Buffer,
    },
    likes: {
      type: Array,
      default: [],
    },
    tags: {
      type: [Object],
      default: [],
    },
    comments: [CommentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
