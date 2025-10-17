import mongoose, { Schema } from "mongoose";

const storeSchema = new Schema(
    {
        // Store basic info
        name: {
            type: String,
            unique: true,
            required: [true, "Store name is required"],
            trim: true,
            minlength: [2, "Store name must be at least 3 characters"],
            maxlength: [15, "Store name must be less than 50 characters"],
        },

        storename: {
            type: String,
            unique: true,
            required: [true, "storename  is required"],
            trim: true,
            minlength: [2, "Store name must be at least 3 characters"],
            maxlength: [15, "Store name must be less than 50 characters"],
        },

        // Creator (store owner)
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Store owner is required"],
        },
        // Store status
        status: {
            type: String,
            enum: ["active", "inactive", "suspended", "deleted"],
            default: "active",
        },
        // Timestamps for analytics
        lastActive: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);


// Optional: cascade delete related data (products, orders, etc.)
storeSchema.pre("remove", async function (next) {
    const storeId = this._id;
    await mongoose.model("Product").deleteMany({ store: storeId });
    await mongoose.model("Order").deleteMany({ store: storeId });
    await mongoose.model("StoreUser").deleteMany({ store: storeId });
    next();
});

export const Store = mongoose.model("Store", storeSchema);
