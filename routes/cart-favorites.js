import { Router } from "express";
import { addToCart, addToFavorite, removeFromCart, removeFromFavorites, viewCart, placeOrder} from "../controllers/cart-favorites.js";

export const router = Router();

router.post("/add-to-cart", addToCart);
router.post("/add-favorite", addToFavorite);
router.delete("/remove-from-cart", removeFromCart);
router.delete("/remove-from-favorites", removeFromFavorites);
router.get("/view-cart", viewCart);
router.post("/place-order", placeOrder);
