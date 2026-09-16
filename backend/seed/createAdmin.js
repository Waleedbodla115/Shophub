"use strict";
require("dotenv").config();
const connectDB=require("../config/db");
const User=require("../models/User");
(async()=>{try{await connectDB();const email=(process.env.ADMIN_EMAIL||"admin@shophub.local").toLowerCase().trim();const password=process.env.ADMIN_PASSWORD||"ChangeMe123!";let user=await User.findOne({email});if(user){user.isAdmin=true;user.password=password;await user.save();console.log(`Admin updated: ${email}`)}else{user=await User.create({name:process.env.ADMIN_NAME||"ShopHub Admin",email,password,isAdmin:true});console.log(`Admin created: ${email}`)}process.exit(0)}catch(e){console.error(e);process.exit(1)}})();
