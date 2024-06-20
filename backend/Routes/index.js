const express = require("express");
const router=express.Router();


const blogRouter=require("./blog");
const userRouter = require("./user");

router.use("/user",userRouter);
router.use("/blog",blogRouter)

module.exports = router;