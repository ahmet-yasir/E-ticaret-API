import { Router } from "express";
import { addAddress, chancePassword, deleteAddress, userAddresses, userOrders, userPremium, updateUserAddress, orderHistory} from "../controllers/profile.js";

export const router = Router();

router.post("/add-address", addAddress);
router.put("/change-password", chancePassword);
router.delete("/delete-address", deleteAddress);
router.get("/user-addresses", userAddresses);
router.get("/user-Orders", userOrders);
router.put("/user-premium", userPremium);
router.put("/update-user-address", updateUserAddress);
router.get("/order-history", orderHistory);
