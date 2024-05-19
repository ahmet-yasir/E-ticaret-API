import express from 'express';
import cors from 'cors';
import { router as loginRouter } from './routes/login.js';
import { router as profileRouter } from './routes/profile.js';
import { router as productRouter } from './routes/product.js';
import { router as cartAndFavoritesRouter } from './routes/cart-favorites.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/",loginRouter);
app.use("/",profileRouter);
app.use("/",productRouter);
app.use("/",cartAndFavoritesRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});