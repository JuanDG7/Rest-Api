const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
//hola
const Post = require("../models/post");
const User = require("../models/user"); // import the User model

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1; // get the current page from query params, default to 1
  const perPage = 2; // number of posts per lastPage
  let totalItems; // total number of posts
  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count; // get the total number of posts
      return Post.find()
        .skip((currentPage - 1) * perPage) // skip the posts of previous pages
        .limit(perPage); // limit the number of posts to perPage
    })
    .then((posts) => {
      res.status(200).json({
        message: "Fetched posts successfully.",
        posts: posts,
        totalItems: totalItems,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }); // handle errors
};

exports.createPost = (req, res, next) => {
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
  post
    .save()
    .then((result) => {
      return User.findById(req.userId); // find the user who created the post
    })
    .then((user) => {
      creator = user; // get the user who created the post
      user.posts.push(post); // add the post to the user's posts
      return user.save(); // save the user
    })
    .then((result) => {
      res.status(201).json({
        message: "Post created successfully!",
        post: post,
        creator: {
          _id: creator._id,
          name: creator.name,
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err); // handle errors
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: "Post fetched.", post: post });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = (req, res, next) => {
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

  Post.findById(postId)
    .then((post) => {
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
      return post.save();
    })
    .then((result) => {
      res.status(200).json({ message: "Post updated!", post: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
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
      return Post.findByIdAndDelete(postId);
    })
    .then((result) => {
      return User.findById(req.userId); // find the user who created the post
    })
    .then((user) => {
      user.posts.pull(postId); // remove the post from the user's posts
      return user.save(); // save the user
    })
    .then((result) => {
      res.status(200).json({ message: "Post deleted!" });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath); // get the absolute path\
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};
