const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const Post = require("./Post");

const NotificationSchema = new mongoose.Schema(
  {
    postId: {
      type: ObjectId,
      ref: "Post",
    },
    senderId: {
      type: String,
    },
    receiverId: {
      type: String,
    },
    senderName: {
      type: String,
    },
    senderProfilePicture: {
      type: Buffer,
    },
    type: {
      type: String,
    },
    status: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const OtpSchema = new mongoose.Schema({
  email: {
    type: String,
  },
  otp: {
    type: String,
  },
  expiresAt: {
    type: Date,
  },
});

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      require: true,
      min: 3,
      max: 20,
      unique: true,
    },
    email: {
      type: String,
      require: true,
      max: 50,
      unique: true,
    },
    password: {
      type: String,
      require: true,
      min: 6,
    },
    profilePicture: {
      type: Buffer,
    },
    coverPicture: {
      type: Buffer,
    },
    friendRequests: [
      {
        _id: {
          type: String,
        },
        profilePicture: {
          type: Buffer,
        },
        username: {
          type: String,
        },
      },
    ],
    sentRequest: {
      type: Array,
      default: [],
    },
    friends: {
      type: Array,
      default: [],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    desc: {
      type: String,
      max: 50,
    },
    city: {
      type: String,
      max: 50,
    },
    from: {
      type: String,
      max: 50,
    },
    relationship: {
      type: String,
      max: 50,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    notifications: [NotificationSchema],
    bookmarks: [{
      type: ObjectId,
      ref: "Post"
    }],
    emailVerified: {
      type: Boolean,
      default: false,
    },
    otpDetails: OtpSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
