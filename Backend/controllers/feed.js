const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
//hola
const Post = require("../models/post");
const User = require("../models/user"); // import the User model

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Fetched posts successfully.",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path.replace(/\\/g, "/"); // replace backslash with forward slash for compatibility
  const title = req.body.title;
  const content = req.body.content;

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId, //aca le paso un string pero al crear el post se vuelve a convertir en un objectId
  });

  try {
    await post.save(); // save the post to the database
    const user = await User.findById(req.userId); // find the user who created the post
    user.posts.push(post); // add the post to the user's posts
    await user.save(); // save the user
    res.status(201).json({
      message: "Post created successfully!",
      post: post,
      creator: {
        _id: user._id,
        name: user.name,
      },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err); // handle errors}
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("Could not find post.");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: "Post fetched.", post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image; // this is the old image URL

  if (req.file) {
    imageUrl = req.file.path.replace(/\\/g, "/"); // replace backslash with forward slash for compatibility
  }
  if (!imageUrl) {
    const error = new Error("No file picked.");
    error.statusCode = 422;
    throw error;
  }
  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Could not find post.");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not authorizedeeeeee!");
      error.statusCode = 403;
      throw error;
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl); // delete the old image
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();
    res.status(200).json({ message: "Post updated!", post: result });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  const post = await Post.findById(postId);

  if (!post) {
    const error = new Error("Could not find post.");
    error.statusCode = 404;
    throw error;
  }

  if (post.creator.toString() !== req.userId) {
    const error = new Error("Not authorizedeeeeee!");
    error.statusCode = 403;
    throw error;
  }

  clearImage(post.imageUrl); // delete the image
  await Post.findByIdAndDelete(postId);

  try {
    const user = await User.findById(req.userId); // find the user who created the post

    user.posts.pull(postId); // remove the post from the user's posts
    await user.save(); // save the user

    res.status(200).json({ message: "Post deleted!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath); // get the absolute path\
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};
