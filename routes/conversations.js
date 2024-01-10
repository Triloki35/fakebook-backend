const router = require("express").Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// new conversation

router.post("/", async (req, res) => {
  const newConversation = new Conversation({
    members: [req.body.senderId, req.body.reciverId],
  });
  try {
    const saveConversation = await newConversation.save();
    res.status(200).json(saveConversation);
  } catch (error) {
    res.status(500).json(error);
  }
});

// get Conversation

router.get("/:userId", async (req, res) => {
  try {
      // Fetch all conversations involving the user
      const conversations = await Conversation
          .find({ members: { $in: [req.params.userId] } })
          .sort({ updatedAt: -1 })
          .exec();

      // Fetch the most recent message for each conversation
      const conversationsWithLastMessages = await Promise.all(
          conversations.map(async (conversation) => {
              const lastMessage = await Message
                  .findOne({ conversationId: conversation._id })
                  .sort({ createdAt: -1 });

              return {
                  conversation,
                  lastMessage,
              };
          })
      );

      // Sort conversations based on the timestamp of the most recent message
      const sortedConversations = conversationsWithLastMessages.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return b.lastMessage.createdAt - a.lastMessage.createdAt;
      });

      res.status(200).json(sortedConversations);
  } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
  }
});



router.get("/find/:userId1/:userId2", async (req, res) => {
  try {
      let conversation = await Conversation.findOne({
        members: { $all: [req.params.userId1,req.params.userId2] },
      });

      // ********handle case where no conversation found between pepole****
      if (!conversation) {
        conversation = new Conversation({
          members: [req.params.userId1, req.params.userId2],
        });
        await conversation.save();
      }

      res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fetch all conversations and related unseen messages for a user
router.get("/unseen/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch all conversations involving the user
    const conversations = await Conversation.find({ members: userId });

    let totalUnseenCount = 0;
    let unseenConversations = [];

    // Iterate through each conversation
    for (const conversation of conversations) {
      // Fetch all unseen messages for the conversation
      const unseenMessages = await Message.find({
        conversationId: conversation._id,
        senderId: { $ne: userId }, // Sender is not the user
        seen: false,
      });

      if (unseenMessages.length > 0) {
        // If there are unseen messages, update the total count and add to the result
        totalUnseenCount += unseenMessages.length;
        unseenConversations.push({
          conversation,
          unseenMessages,
        });
      }
    }
  
    res.status(200).json({
      totalUnseenCount,
      unseenConversations,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
