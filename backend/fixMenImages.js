require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product"); // adjust path/name if your model file differs

const fixes = {
    "Men's Running Shoes": "/images/men/men-sneaker.png",
    "Men's Smart Watch": "/images/men/men-watch.png",
    "Men's Denim Jacket": "/images/men/men-jacket.png",
};

async function run() {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shophub");

    for (const [name, image] of Object.entries(fixes)) {
        const result = await Product.updateOne({ name }, { $set: { image } });
        console.log(name, "->", image, "matched:", result.matchedCount, "modified:", result.modifiedCount);
    }

    await mongoose.disconnect();
    console.log("Done.");
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});