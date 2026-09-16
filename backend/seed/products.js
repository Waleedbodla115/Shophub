"use strict";

require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("../models/Product");


// =========================================================
// PRODUCTS
// =========================================================

const products = [

    // =====================================================
    // MEN
    // =====================================================

    {
        name: "Men's Denim Jacket",
        description: "Classic men's denim jacket for everyday style.",
        price: 79,
        category: "men",
        image: "/images/men/men-jacket.png",
        stock: 20,
        rating: 4.5
    },

    {
        name: "Men's Running Shoes",
        description: "Comfortable running shoes designed for everyday activity.",
        price: 89,
        category: "men",
        image: "/images/men/men-sneaker.png",
        stock: 25,
        rating: 4.4
    },

    {
        name: "Men's Smart Watch",
        description: "Modern smart watch with fitness and daily tracking features.",
        price: 149,
        category: "men",
        image: "/images/men/men-watch.png",
        stock: 15,
        rating: 4.6
    },

    {
        name: "Men's Casual Shirt",
        description: "Comfortable casual shirt for everyday wear.",
        price: 49,
        category: "men",
        image: "/images/men/men-dress.jpg",
        stock: 30,
        rating: 4.2
    },

    {
        name: "Men's Jeans",
        description: "Classic fit men's jeans.",
        price: 59,
        category: "men",
        image: "/images/men/men-jeans.jpg",
        stock: 25,
        rating: 4.3
    },


    // =====================================================
    // WOMEN
    // =====================================================

    {
        name: "Women's Summer Dress",
        description: "Lightweight and stylish summer dress.",
        price: 69,
        category: "women",
        image: "/images/women/women,s summer dress.jpg",
        stock: 20,
        rating: 4.6
    },

    {
        name: "Women's Casual Top",
        description: "Stylish casual top for everyday outfits.",
        price: 39,
        category: "women",
        image: "/images/women/women,s causal top.jpg",
        stock: 25,
        rating: 4.3
    },

    {
        name: "Women's Handbag",
        description: "Elegant handbag suitable for everyday use.",
        price: 79,
        category: "women",
        image: "/images/women/women,s handbag.jpg",
        stock: 15,
        rating: 4.5
    },

    {
        name: "Women's Jacket",
        description: "Fashionable women's jacket.",
        price: 89,
        category: "women",
        image: "/images/women/women,s jacket.jpg",
        stock: 18,
        rating: 4.4
    },

    {
        name: "Women's Sneakers",
        description: "Comfortable and stylish women's sneakers.",
        price: 75,
        category: "women",
        image: "/images/women/women,s sneakers.jpg",
        stock: 20,
        rating: 4.4
    },

    {
        name: "Women's Smart Watch",
        description: "Stylish smart watch with modern features.",
        price: 139,
        category: "women",
        image: "/images/women/women,s smart watch.jpg",
        stock: 12,
        rating: 4.5
    },


    // =====================================================
    // KIDS
    // =====================================================

    {
        name: "Kids Summer Dress",
        description: "Colorful and comfortable summer dress for kids.",
        price: 35,
        category: "kids",
        image: "/images/kids/kids summer dress.jpg",
        stock: 20,
        rating: 4.5
    },

    {
        name: "Kids Jacket",
        description: "Warm and comfortable kids jacket.",
        price: 45,
        category: "kids",
        image: "/images/kids/kids jacket.jpg",
        stock: 18,
        rating: 4.3
    },

    {
        name: "Kids Sneakers",
        description: "Comfortable sneakers for active kids.",
        price: 39,
        category: "kids",
        image: "/images/kids/kids sneakers.jpg",
        stock: 25,
        rating: 4.4
    },

    {
        name: "Kids T-Shirt",
        description: "Soft and comfortable kids t-shirt.",
        price: 25,
        category: "kids",
        image: "/images/kids/kids t shirt.jpg",
        stock: 30,
        rating: 4.2
    },

    {
        name: "Kids Accessories",
        description: "Fun accessories collection for kids.",
        price: 29,
        category: "kids",
        image: "/images/kids/kids accesssories.jpg",
        stock: 20,
        rating: 4.1
    },


    // =====================================================
    // ACCESSORIES
    // =====================================================

    {
        name: "Classic Watch",
        description: "Elegant classic watch for everyday wear.",
        price: 99,
        category: "accessories",
        image: "/images/accessories/classic watch.jpg",
        stock: 15,
        rating: 4.5
    },

    {
        name: "Leather Handbag",
        description: "Premium leather handbag.",
        price: 119,
        category: "accessories",
        image: "/images/accessories/handbag.jpg",
        stock: 10,
        rating: 4.6
    },

    {
        name: "Leather Belt",
        description: "Classic leather belt with durable finish.",
        price: 35,
        category: "accessories",
        image: "/images/accessories/leather belt.jpg",
        stock: 30,
        rating: 4.3
    },

    {
        name: "Sun Glasses",
        description: "Stylish sunglasses for everyday use.",
        price: 45,
        category: "accessories",
        image: "/images/accessories/sun glasses.jpg",
        stock: 25,
        rating: 4.2
    },

    {
        name: "Leather Wallet",
        description: "Compact and durable leather wallet.",
        price: 39,
        category: "accessories",
        image: "/images/accessories/wallet.jpg",
        stock: 25,
        rating: 4.4
    },


    // =====================================================
    // ELECTRONICS
    // =====================================================

    {
        name: "Wireless Earbuds",
        description: "Compact wireless earbuds with clear sound.",
        price: 59,
        category: "electronics",
        image: "/images/electronics/Earbuds.jpg",
        stock: 25,
        rating: 4.5
    },

    {
        name: "Power Bank",
        description: "Portable power bank for everyday charging.",
        price: 49,
        category: "electronics",
        image: "/images/electronics/powebank.jpg",
        stock: 30,
        rating: 4.3
    },

    {
        name: "Smart Watch",
        description: "Modern smart watch with useful daily features.",
        price: 129,
        category: "electronics",
        image: "/images/electronics/smart watch.jpg",
        stock: 15,
        rating: 4.5
    },

    {
        name: "Wireless Bluetooth Headphones",
        description: "Comfortable wireless Bluetooth headphones.",
        price: 79,
        category: "electronics",
        image: "/images/electronics/wireless BT.jpg",
        stock: 20,
        rating: 4.4
    },

    {
        name: "Wireless Speaker",
        description: "Portable wireless speaker with powerful sound.",
        price: 69,
        category: "electronics",
        image: "/images/electronics/wireless speakers.jpg",
        stock: 18,
        rating: 4.4
    }

];


// =========================================================
// SEED DATABASE
// =========================================================

const seedProducts = async () => {

    try {

        console.log("=================================");
        console.log("🌱 Starting Product Seed...");
        console.log("=================================");


        // Connect MongoDB
        await mongoose.connect(process.env.MONGO_URI);

        console.log("✅ MongoDB Connected");


        // Remove existing products
        await Product.deleteMany({});

        console.log("🗑️ Existing products removed");


        // Insert products
        const insertedProducts = await Product.insertMany(products);


        console.log("=================================");
        console.log(`✅ ${insertedProducts.length} Products Inserted`);
        console.log("=================================");


        // Close connection
        await mongoose.connection.close();

        console.log("🔌 MongoDB Connection Closed");

        process.exit(0);

    } catch (error) {

        console.error("❌ Seed Error:");
        console.error(error);

        await mongoose.connection.close();

        process.exit(1);

    }

};


// =========================================================
// RUN
// =========================================================

seedProducts();
