const router = require("express").Router();
const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const upload = multer({ storage });

// create a post

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { userId, username, desc, tags } = req.body;

    // Check if an image was uploaded
    const imgData = req.file ? req.file.buffer : null;

    // Check if tags are provided
    const parsedTags = tags ? tags.map((tag) => JSON.parse(tag)) : [];

    // Check if either desc or imgData is provided
    if (!desc && !imgData) {
      return res.status(400).json({ error: "Either 'desc' or 'image' must be provided." });
    }
    
    const user = await User.findById(userId);
    const profilePicture = user.profilePicture;

    // Create a new post in your MongoDB collection
    const newPost = new Post({
      userId,
      username,
      profilePicture:profilePicture,
      desc,
      img: imgData, // Store binary image data directly
      tags: parsedTags,
    });

    const savedPost = await newPost.save();

    // Send notifications to tagged users
    if (parsedTags.length > 0) {
      for (const tag of parsedTags) {
        const taggedUserId = tag._id;

        // Check if the tagged user exists
        const taggedUser = await User.findById(taggedUserId);

        if (taggedUser) {
          const notification = {
            postId: savedPost._id,
            senderId: userId,
            senderName: username,
            senderProfilePicture: profilePicture, 
            type: "tagged",
            status: false,
          };

          taggedUser.notifications.push(notification);
          await taggedUser.save();
        }
      }
    }

    res.status(201).json(savedPost);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error saving the post.");
  }
});


// get a post

router.get("/:id", async function (req, res) {
  try {
    const post = await Post.findById(req.params.id);
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
});

// get timeline posts

router.get("/timeline/:userId", async function (req, res) {
  try {
    const PAGE_SIZE = 5;
    const user = await User.findById(req.params.userId);
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * PAGE_SIZE;

    let allPosts = [];
  
    const userPost = await Post.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    const friendsPosts = await Promise.all(
      user.friends.map((friendId) => {
        return Post.find({ userId: friendId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(PAGE_SIZE);
      })
    );

    allPosts = userPost.concat(...friendsPosts);

    // If allPosts is empty, fetch random posts from the database
    // if (allPosts.length === 0) {
    //   const randomPosts = await Post.aggregate([{ $sample: { size: PAGE_SIZE } }]);
    //   allPosts = randomPosts;
    // }

    res.status(200).json(allPosts);
  } catch (error) {
    res.status(500).json(error);
  }
});



// get profile posts
router.get("/profile/:username", async function (req, res) {
  try {
    const PAGE_SIZE = 5; 
    const user = await User.findOne({ username: req.params.username });
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * PAGE_SIZE;

    const userPost = await Post.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    
      const postsWithUserInfo = await Promise.all(
        userPost.map(async (post) => {
          const userInfo = await User.findById(post.userId);
          return {
            ...post._doc,
            username: userInfo.username,
            profilePicture: userInfo.profilePicture,
          };
        })
      );
    

    res.status(200).json(postsWithUserInfo);
  } catch (error) {
    res.status(500).json("error");
  }
});


//***  update post***//

router.put("/:id", async function (req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (post.userId === req.body.userId) {
      await post.updateOne({ $set: req.body });
      res.status(200).json("the post has been updated");
    } else {
      res.status(403).json("you can only update your post");
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

// delete a post

router.delete("/:id/:userId", async function (req, res) {
  try {
    const post = await Post.findById(req.params.id);

    if (post.userId === req.params.userId) {
      await post.deleteOne();
      res.status(200).json("the post has been deleted");
    } else {
      res.status(403).json("you can only delete your post");
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

// check bookmark or not
router.get("/check-bookmark/:userId/:postId", async function (req, res) {
  try {

    const userId = req.params.userId;
    const postId = req.params.postId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isBookmarked = user.bookmarks.includes(postId);

    res.status(200).json({ isBookmarked });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// save post

router.post("/save-post/:userId", async function (req, res) {
  try {
    const userId = req.params.userId;
    const postId = req.body.postId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updateQuery = user.bookmarks.includes(postId)
      ? { $pull: { bookmarks: postId } }
      : { $push: { bookmarks: postId } };

    const updatedUser = await User.findByIdAndUpdate(userId, updateQuery, { new: true });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json(error);
  }
});




// like and dislike post

router.put("/:id/like", async function (req, res) {
  try {
    const postId = req.params.id;
    const userId = req.body.userId;

    // Find the post
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has already liked the post
    const isLiked = post.likes.includes(userId);

    if (!isLiked) {
      // User is liking the post
      await post.updateOne({ $push: { likes: userId } });

      // Check if the post owner is not the one performing the action
      if (post.userId.toString() !== userId) {
        // fetch sender data
        const sender = await User.findById(userId);

        // Push like notification to the post owner
        const notification = {
          postId: postId,
          senderId: userId,
          senderName: sender.username, 
          senderProfilePicture: sender.profilePicture, 
          type: "liked",
          status: false,
        };

        const postOwner = await User.findById(post.userId);

        if (postOwner) {
          postOwner.notifications.push(notification);
          await postOwner.save();
        }
      }

      res.status(200).json({ message: "Post liked", action: "liked" });
    } else {
      // User is disliking the post
      await post.updateOne({ $pull: { likes: userId } });

      // Check if the post owner is not the one performing the action
      if (post.userId.toString() !== userId) {
        // Pull like notification from the post owner
        const postOwner = await User.findById(post.userId);

        if (postOwner) {
          postOwner.notifications = postOwner.notifications.filter(
            (notif) => !(notif.postId === postId && notif.senderId === userId && notif.type === "like")
          );
          await postOwner.save();
        }
      }

      res.status(200).json({ message: "Post disliked", action: "disliked" });
    } 
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// get all comments

router.get("/comments/:postId",async function(req,res){
  try {
    const post = await Post.findById(req.params.postId);
    res.status(200).json(post.comments);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
})

// comment on post

router.post("/comments/:postId", async function (req, res) {
  try {
    const postId = req.params.postId;
    const { senderId, text, profilePicture, senderName } = req.body;

    // Find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the comment sender is not the post owner
    if (senderId !== post.userId.toString()) {
      // Create a new comment
      const newComment = {
        senderId,
        senderName,
        text,
        profilePicture,
      };

      // Add the comment to the post's comments array
      post.comments.push(newComment);

      // Save the post with the new comment
      await post.save();

      // Push comment notification to the post owner
      const notification = {
        postId,
        senderId,
        senderName,
        senderProfilePicture: profilePicture,
        type: "commented",
        status: false,
      };

      const postOwner = await User.findById(post.userId);

      if (postOwner) {
        postOwner.notifications.push(notification);
        await postOwner.save();
      }
    }
  
    res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


// delete comment
router.delete("/comments/:postId/:commentId", async function (req, res) {
  try {
    const postId = req.params.postId;
    const commentId = req.params.commentId;
    const userId = req.body.userId;

    // Find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Find the comment in the post's comments array
    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if the user is the post owner or the comment sender
    if (userId === post.userId.toString() || userId === comment.senderId.toString()) {
      // Remove the comment from the post's comments array
      comment.remove();

      // Save the post without the removed comment
      await post.save();

      // Pull the comment-related notification from the post owner
      const postOwner = await User.findById(post.userId);

      if (postOwner) {
        postOwner.notifications = postOwner.notifications.filter(
          (notif) => !(notif.postId === postId && notif.senderId === comment.senderId && notif.type === "comment")
        );
        await postOwner.save();
      }

      res.status(200).json({ message: "Comment deleted successfully" });
    } else {
      res.status(403).json({ message: "Permission denied to delete the comment" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/bookmarks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get bookmarks from the user document
    const bookmarks = user.bookmarks;

    // Use mongoose's $in operator to find posts with matching IDs
    const bookmarkedPosts = await Post.find({ _id: { $in: bookmarks } });

    res.json(bookmarkedPosts);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});






module.exports = router;
