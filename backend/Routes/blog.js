const express = require("express");
const zod = require("zod");
const mongoose = require("mongoose");
const { Blog, User } = require("../db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../config");

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(400).json({ message: "Invalid token." });
    }
};

// Zod validation schemas
const blogBody = zod.object({
    title: zod.string().min(1),
    description: zod.string().min(1),
});

const blogIdParam = zod.object({
    blogId: zod.string().regex(/^[0-9a-fA-F]{24}$/), // Validate MongoDB ObjectId format
});

// Create a blog
router.post("/create", authenticateToken, async (req, res) => {
    const { success, error } = blogBody.safeParse(req.body);
    if (!success) {
        return res.status(400).json({ message: "Invalid blog data.", error: error.errors });
    }

    const { title, description } = req.body;

    try {
        const blog = new Blog({
            title,
            description,
            author: req.userId,
        });

        await blog.save();

        res.status(201).json({ message: "Blog created successfully", blog });
    } catch (error) {
        console.error("Error creating blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete a blog
router.delete("/delete/:blogId", authenticateToken, async (req, res) => {
    const { success, error } = blogIdParam.safeParse(req.params);
    if (!success) {
        return res.status(400).json({ message: "Invalid blog ID.", error: error.errors });
    }

    const { blogId } = req.params;

    try {
        const blog = await Blog.findOneAndDelete({ _id: blogId, author: req.userId });

        if (!blog) {
            return res.status(404).json({ message: "Blog not found or not authorized to delete." });
        }

        res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update a blog
router.put("/update/:blogId", authenticateToken, async (req, res) => {
    const { success: bodySuccess, error: bodyError } = blogBody.safeParse(req.body);
    const { success: paramSuccess, error: paramError } = blogIdParam.safeParse(req.params);

    if (!bodySuccess) {
        return res.status(400).json({ message: "Invalid blog data.", error: bodyError.errors });
    }

    if (!paramSuccess) {
        return res.status(400).json({ message: "Invalid blog ID.", error: paramError.errors });
    }

    const { blogId } = req.params;
    const { title, description } = req.body;

    try {
        const blog = await Blog.findOneAndUpdate(
            { _id: blogId, author: req.userId },
            { title, description },
            { new: true }
        );

        if (!blog) {
            return res.status(404).json({ message: "Blog not found or not authorized to update." });
        }

        res.status(200).json({ message: "Blog updated successfully", blog });
    } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all blogs by the authenticated user
router.get("/myblogs", authenticateToken, async (req, res) => {
    try {
        const blogs = await Blog.find({ author: req.userId });

        if (!blogs.length) {
            return res.status(404).json({ message: "No blogs found." });
        }

        res.status(200).json({ blogs });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
