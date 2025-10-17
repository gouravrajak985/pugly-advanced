import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Store } from "../models/storeModel.js";

const createStore = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const user = req.user;

    if (!name) {
        throw new ApiError(400, "All fields are required");
    }

    const existedStore = await Store.findOne({ name });
    if (existedStore) {
        throw new ApiError(409, "Store with same name already exists");
    }
    const storename = name.toLowerCase();
    const store = await Store.create({
        name: name,
        storename: storename,
        owner: user._id,
    });
    const createdStore = await Store.findById(store._id);
    if (!createdStore) {
        throw new ApiError(500, "Something went wrong while creating store.");
    }

    return res.status(201).json(
        new ApiResponse(201, createdStore, "Store created successfully")
    );
});

const deleteStore = asyncHandler(async (req, res) => {
    const store = await Store.findById(req.params.storeId);
    if (!store) {
        throw new ApiError(404, "Store not found")
    };
    if (store.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this store")

    }
    await store.deleteOne();
    return res.status(200).json(
        new ApiResponse(200, store, "Store deleted successfully")
    );
});

const getStore = asyncHandler(async (req, res) => {
    const store = await Store.findById(req.params.storeId);
    if (!store) {
        throw new ApiError(404, "Store not found")
    };
    return res.status(200).json(
        new ApiResponse(200, store, "Store fetched successfully")
    );
});

export { createStore, deleteStore };