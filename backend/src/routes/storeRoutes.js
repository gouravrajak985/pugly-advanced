import { Router } from "express";
import {
    createStore,
    deleteStore
} from "../controllers/storeController.js";
import { verifyJWT } from "../middleware/authMiddleware.js";

const router = Router();

router.route("/create").post(verifyJWT, createStore);

router.route("/delete/:storeId").delete(verifyJWT, deleteStore);

export default router;
