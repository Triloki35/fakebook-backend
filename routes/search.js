const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const { getJson } = require("serpapi");

// Search endpoint for users and posts
router.get("/search-results", async (req, res) => {
  const { query } = req.query;

  try {
    // Search for users
    const userResults = await User.find({
      username: { $regex: new RegExp(query, "i") },
    }).select("username profilePicture");

    // Search for posts
    const postResults = await Post.find({
      desc: { $regex: new RegExp(query, "i") },
    }).select("desc userId img");

    res.json({
      users: userResults,
      posts: postResults,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/search-events/:query/:country", async (req, res) => {

  try {
    const {query,country} = req.params;

    const response = await getJson({
      engine: "google_events",
      q: query,
      hl: "en",
      gl: country,
      api_key: process.env.SERPAPI_KEY,
    });

    res.status(200).send(response.events_results);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }

});

module.exports = router;
