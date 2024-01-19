const router = require("express").Router();
const Message = require("../models/Message");
const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

// new Message
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { conversationId, senderId, text } = req.body;

    let image;
    if (req.file) {
      image = req.file ? req.file.buffer : null;
    }

    const newMessage = new Message({
      conversationId,
      senderId,
      content: {
        text,
        image,
      },
    });

    await newMessage.save();
    res.status(200).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// get Message
router.get("/:conversationId", async (req, res) => {
    try {
        const messages = await Message.find({ conversationId: req.params.conversationId });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// get last message
router.get("/:conversationId/last", async (req, res) => {
    try {
        const lastMessage = await Message.findOne({ conversationId: req.params.conversationId })
            .sort({ createdAt: -1 }) // Sorting in descending order based on createdAt timestamp
            .limit(1);

        res.status(200).json(lastMessage);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Mark all message of particular convo as seen
router.put("/:conversationId/seen", async (req, res) => {
    try {
        const { userId } = req.body;
        const conversationId = req.params.conversationId;

        // Find all messages in the conversation where the sender is not the user
        const updatedMessages = await Message.updateMany(
            { conversationId, senderId: { $ne: userId } },
            { seen: true }
        );

        res.status(200).json({ updatedCount: updatedMessages.nModified });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// Mark a message as seen v2
router.put("/seenByText/:text", async (req, res) => {
    try {
        const { userId, senderId } = req.body;
        const { text } = req.params;

        if (userId !== senderId) {
            // Find the most recent message with the given text
            const mostRecentMessage = await Message.findOne({
                text,
                senderId,
                userId,
            }).sort({ createdAt: -1 });

            if (mostRecentMessage) {
                // Mark the most recent message as seen
                const updatedMessage = await Message.findByIdAndUpdate(
                    mostRecentMessage._id,
                    { seen: true }
                );
                res.status(200).json(updatedMessage.seen);
            } else {
                res.status(404).json({ error: "Message not found" });
            }
        } else {
            res.status(200).json("user and sender are the same.");
        }
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// get seen status of message
router.get("/:messageId/seen", async (req, res) => {
    try {
      const messageId = req.params.messageId;
  
      // Find the message by messageId
      const message = await Message.findById(messageId);
  
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
  
      // Return the seen status of the message
      res.status(200).json({ seen: message.seen });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

module.exports = router;
