import { Router } from "express";
import { addReview, deleteReview, filterProduct, viewProductPage, productDetails, searchProduct, shortProducts, updateReview, productReviews} from "../controllers/product.js";

export const router = Router();

router.post("/add-review", addReview);
router.delete("/delete-review", deleteReview);
router.get("/filter-products", filterProduct);
router.get("/product-details-and-reviews/:productID", viewProductPage);
router.get("/product-details/:productID", productDetails);
router.get("/search-product", searchProduct);
router.get("/sort-products", shortProducts);
router.put("/update-review", updateReview);
router.get("/product-reviews", productReviews);
