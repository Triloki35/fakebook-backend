const bcrypt = require("bcrypt");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const { log } = require("console");

const router = require("express").Router();

// Define storage and upload middleware for profile pictures
const profilePictureStorage = multer.memoryStorage();
const profilePictureUpload = multer({ storage: profilePictureStorage });

// Define storage and upload middleware for cover pictures
const coverPictureStorage = multer.memoryStorage();
const coverPictureUpload = multer({ storage: coverPictureStorage });

// change or recover user password

router.put("/change-password", async function (req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Email is not verified. Please verify your email first.",
      });
    }

    if (password) {
      try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user.password = hashedPassword;
      } catch (error) {
        return res.status(500).json({ error: "Error hashing password." });
      }
    }

    try {
      await user.save();
      return res
        .status(200)
        .json({ message: "Password has been successfully updated." });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Error saving user to the database." });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occurred while processing the request." });
  }
});

// update user profile-pic
router.post(
  "/uploadProfilePic",
  profilePictureUpload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }

      const { _id } = req.body;
      if (!_id) {
        return res.status(400).send("No user ID provided.");
      }

      // Accessing the buffer containing the image data
      const imgBuffer = req.file.buffer;

      // Updateing the user's profilePicture field with the image buffer
      const user = await User.findByIdAndUpdate(
        _id,
        { $set: { profilePicture: imgBuffer } },
        { new: true }
      );

      if (!user) {
        return res.status(404).send("User not found.");
      }

      res.status(200).send(user);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading profile picture.");
    }
  }
);

// update cover pic
router.post(
  "/uploadcoverPic",
  coverPictureUpload.single("coverPicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }

      const { _id } = req.body;
      if (!_id) {
        return res.status(400).send("No user ID provided.");
      }

      // Accessing the buffer containing the image data
      const imgBuffer = req.file.buffer;

      // Updateing the user's coverPicture field
      const user = await User.findByIdAndUpdate(
        _id,
        { $set: { coverPicture: imgBuffer } },
        { new: true }
      );

      if (!user) {
        return res.status(404).send("User not found.");
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).send("Error uploading cover picture.");
    }
  }
);

// update about

router.post("/updateAbout", async (req, res) => {
  const { city, from, relationship, _id } = req.body;

  try {
    // Update the user's "About" information
    const user = await User.findByIdAndUpdate(
      _id,
      {
        city: city,
        from: from,
        relationship: relationship,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).send("Error updating about.");
  }
});
// update Desc

router.post("/updateDesc", async (req, res) => {
  const { desc, _id } = req.body;

  try {
    // Update the user's "Desc" information
    const user = await User.findByIdAndUpdate(
      _id,
      {
        desc: desc,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).send("Error updating desc.");
  }
});

// delete user

router.delete("/delete-user", async function (req, res) {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    try {
      await user.remove();
      return res
        .status(200)
        .json({ message: "User has been successfully deleted." });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Error deleting user from the database." });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occurred while processing the request." });
  }
});

// get a user
router.get("/", async function (req, res) {
  const username = req.query.username;
  const userId = req.query.userId;
  try {
    const projection = { password: 0, createdAt: 0, updatedAt: 0, __v: 0 };
    const user = userId
      ? await User.findById(userId, projection)
      : await User.findOne({ username: username }, projection);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json(error);
  }
});

// get user all friendRequests
router.get("/friend-requests/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).populate("friendRequests");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ friendRequests: user.friendRequests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// send friend request
router.post("/friend-request/:userId", async (req, res) => {
  try {
    const { _id, username } = req.body;
    const userId = req.params.userId;

    // Find the user by userId
    const receiver = await User.findById(userId);
    const sender = await User.findById(_id);

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the friend request already exists
    const existingRequest = receiver.friendRequests.find(
      (request) => request._id === _id
    );

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "You have already sent Friend request." });
    }

    // Push the friend request data into the friendRequests array
    receiver.friendRequests.push({
      _id,
      profilePicture: sender.profilePicture,
      username,
    });

    // adding receiver id to sender sentRequest array
    sender.sentRequest.push(userId);

    // Save the updated receiver data
    await receiver.save();
    await sender.save();
    res.status(200).json(sender);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// cancel request
router.post("/cancel-friend-request/:userId", async (req, res) => {
  try {
    const { _id } = req.body;
    const userId = req.params.userId;

    // Use $pull to remove friend request from receiver's array
    await User.updateOne(
      { _id: _id },
      { $pull: { friendRequests: { _id: userId } } }
    );

    // Use $pull to remove sent request from sender's array
    await User.updateOne({ _id: userId }, { $pull: { sentRequest: _id } });

    // Fetch and return updated sender data (optional)
    const updatedSender = await User.findById(userId);
    return res.status(200).json(updatedSender);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// accept request
router.post("/accept-friend-request/:userId", async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.params.userId;

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the friend request in the friendRequests array
    const friendRequestIndex = user.friendRequests.findIndex(
      (request) => request._id === friendId
    );
    if (friendRequestIndex === -1) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Remove the friend request from the friendRequests array
    const removedRequest = user.friendRequests.splice(friendRequestIndex, 1);

    // Add the friendId to the friends array
    user.friends.push(friendId);

    // Save the updated user data
    await user.save();

    // Send notification to the friend who sent the request
    const friendUser = await User.findById(friendId);
    if (!friendUser) {
      return res.status(404).json({ message: "Friend user not found" });
    }

    const notification = {
      postId: null,
      senderId: userId,
      receiverId: friendId,
      senderName: user.username,
      senderProfilePicture: user.profilePicture,
      type: "accepted", // Notification type for friend request acceptance
      status: false,
    };

    friendUser.notifications.push(notification);

    // Remove user from friend sentRequest
    friendUser.sentRequest = friendUser.sentRequest.filter(
      (id) => id !== userId
    );

    friendUser.friends.push(userId);

    // Save the updated friend user data
    await friendUser.save();

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// reject request
router.post("/reject-friend-request/:userId", async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.params.userId;

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Find the friend request in the friendRequests array
    const friendRequestIndex = user.friendRequests.findIndex(
      (request) => request._id === friendId
    );
    if (friendRequestIndex === -1) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    // Remove the friend request from the friendRequests array
    user.friendRequests.splice(friendRequestIndex, 1);
    // Save the updated user data
    await user.save();

    // frienduser changes
    const friendUser = await User.findById(friendId);
    // remove user from friend sentRequest
    friendUser.sentRequest = friendUser.sentRequest.filter(
      (id) => id !== userId
    );
    // Save the updated friend user data
    await friendUser.save();

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// unfriend user
router.post("/unfriend/:userId", async (req, res) => {
  try {
    const { _id } = req.body;
    const userId = req.params.userId;

    // Use $pull to remove friend from user's friends array
    await User.updateOne({ _id: userId }, { $pull: { friends: _id } });

    // Use $pull to remove user from friend's friends array
    await User.updateOne({ _id: _id }, { $pull: { friends: userId } });

    // Fetch and return updated user data (optional)
    const updatedUser = await User.findById(userId);
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// get user friend
router.get("/friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId, { friends: 1 });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const friendList = await Promise.all(
      user.friends.map(async (friendId) => {
        return User.findById(friendId, {
          username: 1,
          profilePicture: 1,
          _id: 1,
        });
      })
    );

    res.status(200).json(friendList);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// get user friend suggestion
router.get("/friendsuggestion", async (req, res) => {
  try {
    const dontSuggest = req.query.dont;
    const users = await User.find({ _id: { $nin: dontSuggest } }).select(
      "_id username profilePicture"
    );
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching friend suggestions." });
  }
});

// get notification
router.get("/notifications/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const notifications = user.notifications;
    const unreadNotifications = notifications.filter(
      (notification) => !notification.status
    );

    res.status(200).json({
      notifications: notifications,
      unreadNotificationsCount: unreadNotifications.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// notifiaction-status update

router.patch(
  "/update-notification/:notificationId/:userId",
  async (req, res) => {
    try {
      const { notificationId } = req.params;

      // Find the user and their notification by ID
      const user = await User.findById(req.params.userId); // You should implement user authentication middleware
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Find the specific notification by its ID
      const notification = user.notifications.id(notificationId);

      // Update the notification status
      notification.status = true;

      // Save the updated user object
      await user.save();

      res.status(200).json(user.notifications);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// get mutual friends

router.get("/mutual-friends/:userId1/:userId2", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    const user1 = await User.findById(userId1);
    const user2 = await User.findById(userId2);

    if (!user1 || !user2) {
      return res.status(404).json({ message: "User not found" });
    }

    // mutual friends by comparing the friends arrays
    const mutualFriends = user1.friends.filter((friendId) =>
      user2.friends.includes(friendId)
    );

    res.status(200).json(mutualFriends);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint for searching friends
router.get("/search-friends/:userId/:username", async (req, res) => {
  try {
    const { userId, username } = req.params;

    // Ensure that the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Search for friends whose username starts with the provided input
    const friendIds = user.friends;

    const users = await User.find({
      _id: { $in: friendIds },
      username: { $regex: `^${username}`, $options: "i" },
    }).select("username profilePicture");

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
