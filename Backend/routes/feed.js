const express = require("express");

const { body } = require("express-validator");

const feedController = require("../controllers/feed");

const router = express.Router();

// GET /feed/posts
router.get("/posts", feedController.getPosts);

// POST /feed/post
router.post(
  "/post",
  [
    body("title")
      .trim()
      .isLength({ min: 5 })
      .withMessage("Title is too short!"),
    body("content")
      .trim()
      .isLength({ min: 5 })
      .withMessage("Content is too short!"),
  ],
  feedController.createPost
);

module.exports = router;
