import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import {config} from './utils/config.js';
import md5 from 'md5';


const app = express();

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Veritabanına bağlandı.');
    return pool;
  })
  .catch(err => {
    console.error('Veritabanı bağlantı hatası:', err);
    process.exit(1);
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Endpoint to register with email and password
app.post('/register', async (req, res) => {
    const { name, surname, email, password } = req.body;

    const hashedPassword = md5(password);

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.VarChar, name)
            .input('surname', sql.VarChar, surname)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .execute('spAddUserWithPassword');

        if (result.recordset.length > 0 && result.recordset[0].RegisterSuccess === 1) {
            res.status(201).send({ message: result.recordset[0].Message, success:true });
        } 
		else {
            res.status(400).send({ message: 'Invalid email', success: false });
        }
    } 
	catch (err) {
        res.status(500).send({message: 'Kayıt olurken bir hata oluştu', error: err});
    }
});

// Endpoint to register with Google Authentication
app.post('/register-google', async (req, res) => {
    const { name, surname, email, token } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.VarChar, name)
            .input('surname', sql.VarChar, surname)
            .input('email', sql.VarChar, email)
            .input('token', sql.VarChar, token)
            .execute('spAddUserWithGoogleAuth');
        if (result.recordset.length > 0 && result.recordset[0].RegisterSuccess === 1) {
            res.status(201).send({ message: result.recordset[0].Message, success: true });
        } 
		else {
            res.status(400).send({ message: 'Invalid email', success: false});
        }
    } 
    catch (err) {
        res.status(500).send({message: 'Kayıt olurken bir hata oluştu', error: err});
    }
});

// Endpoint to login with email and password
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const hashedPassword = md5(password);

    try {
        const pool = await poolPromise;
        const result = await pool.request()
        .input('email', sql.VarChar, email)
        .input('password', sql.VarChar, hashedPassword)
        .execute('spLoginUserWithPassword');

        if (result.recordset.length > 0 && result.recordset[0].LoginSuccess === 1) {
        	res.status(200).send({ message: result.recordset[0].Message, success:true });
        } 
        else {
        	res.status(401).send({ message: 'Invalid email or password', success:false});
        }
    } 
    catch (err) {
        console.log(err);
    	res.status(500).send({ message: 'Error logging in', error: err });
    }
});

// Endpoint to login with Google Authentication
app.post('/login-google', async (req, res) => {
	const { email, token } = req.body;

	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('email', sql.VarChar, email)
			.input('token', sql.VarChar, token)
			.execute('spLoginUserWithGoogleAuth');

		if (result.recordset[0].LoginSuccess === 1) {
			res.status(200).send({ message: result.recordset[0].Message, success:true });
		} 
		else {
			res.status(401).send({ message: result.recordset[0].Message, success:false});
		}
	} 
	catch (err) {
		res.status(500).send({ message: 'Error logging in with Google', error: err.message });
	}
});

// Endpoint to add address
app.post('/add-address', async (req, res) => {
    const { user_id, name, surname, phone, address, address_title } = req.body;

    try {
        const pool = await poolPromise;
        const userCheckResult = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .query('SELECT 1 FROM Users WHERE user_id = @user_id');

        if (userCheckResult.recordset.length === 0) {
            return res.status(400).send({ message: 'Geçersiz kullanıcı ID.', success: false });
        }

        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('name', sql.VarChar(32), name)
            .input('surname', sql.VarChar(32), surname)
            .input('phone', sql.VarChar(10), phone)
            .input('address', sql.VarChar(200), address)
            .input('address_title', sql.VarChar(30), address_title)
            .execute('spAddAddress');

        res.status(201).send({ message: result.recordset[0].Message, success: true });
    } 
	catch (err) {
        res.status(500).send({ message: 'Adres eklenirken bir hata oluştu', error: err });
    }
});

// Endpoint to add favorite
app.post('/add-favorite', async (req, res) => {
    const { user_id, product_id } = req.body;

    try {
        const pool = await poolPromise;  
        const insertResult = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('product_id', sql.UniqueIdentifier, product_id)
            .execute('spAddFavorite');

        res.status(201).send({ message: insertResult.recordset[0].Message, success: true });
    } 
	catch (err) {
        res.status(500).send({ message: 'Favori eklenirken bir hata oluştu', error: err });
    }
});

// Endpoint to add review
app.post('/add-review', async (req, res) => {
    const { product_id, user_id, review_comment, review_star } = req.body;

    try {
        const pool = await poolPromise;
        const insertResult = await pool.request()
            .input('product_id', sql.UniqueIdentifier, product_id)
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('review_comment', sql.VarChar(512), review_comment)
            .input('review_star', sql.Int, review_star)
            .execute('spAddReview');

        res.status(201).send({ message: insertResult.recordset[0].Message, success: true });
    } 
	catch (err) {
        res.status(500).send({ message: 'Yorum eklenirken bir hata oluştu', error: err });
    }
});

// Endpoint to add product on cart
app.post('/add-to-cart', async (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    try {
        const pool = await poolPromise;
        const cartUpdateResult = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('product_id', sql.UniqueIdentifier, product_id)
            .input('quantity', sql.Int, quantity)
            .execute('spAddToCart');

        res.status(200).send({ message: cartUpdateResult.recordset[0].Message, success: true });
    } 
	catch (err) {
        res.status(500).send({ message: 'Ürün sepete eklenirken bir hata oluştu.', error: err });
    }
});

// Endpoint to chacge password
app.put('/change-Password', async (req, res) => {
    const { user_id, new_password } = req.body;

    const newhashedPassword = md5(new_password);

    try {
        const pool = await poolPromise;
        const chancePasswordResult = await pool.request()
        await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('new_password', sql.VarChar, newhashedPassword)
            .execute('spChangePassword');

        res.status(200).send({ message: chancePasswordResult.recordset[0].Message, success: true });
    } 
	catch (err) {
        res.status(500).send({ message: 'Şifre değiştirme hatası', error: err });
    }
});

// Endpoint to delete address
app.delete('/delete-Address', async (req, res) => {
    const { address_id, user_id } = req.body;

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('address_id', sql.UniqueIdentifier, address_id)
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spDeleteAddress');

        if (result.rowsAffected[0] > 0) {
            res.status(200).send({ message: 'Address deleted successfully', success: true });
        } 
		else {
            res.status(404).send({ message: 'Address not found or does not belong to user', success: false});
        }
    } 
	catch (err) {
        res.status(500).send({ message: 'Adres silme hatası', error: err });
    }
});

// Endpoint to delete review
app.delete('/delete-Review', async (req, res) => {
    const { review_id, user_id } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('review_id', sql.UniqueIdentifier, review_id)
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spDeleteReview');

        if (result.rowsAffected[0] > 0) {
            res.status(200).send({ message: 'Review deleted successfully', success: true });
        } 
		else {
            res.status(404).send({ message: 'Review not found or does not belong to user', success: false });
        }
    } 
	catch (err) {
        res.status(500).send({ message: 'Error deleting review', error: err });
    }
});

// Endpoint to filter product
app.get('/filter-products', async (req, res) => {
    try {
        const { producerID, categoryID, minPrice, maxPrice } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProducerID', sql.Int, producerID)
            .input('CategoryID', sql.Int, categoryID)
            .input('MinPrice', sql.Money, minPrice)
            .input('MaxPrice', sql.Money, maxPrice)
            .execute('spFilterProducts');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error filtering products', error: err });
    }
});

// Endpoint to view product details and reviews
app.get('/product-details-and-reviews/:productID', async (req, res) => {
    try {
        const { productID } = req.params;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('product_id', sql.UniqueIdentifier, productID)
            .execute('spGetProductDetailsAndReviews');

        const productDetailsAndReviews = result.recordset[0];

        if (!productDetailsAndReviews) {
            return res.status(404).send({ error: 'Product not found', error: err });
        }

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error fetching product details and reviews', error: err });
    }
});

// Endpoint to view product details
app.get('/product-details/:productID', async (req, res) => {
    try {
        const { productID } = req.params;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('product_id', sql.UniqueIdentifier, productID)
            .execute('spGetProductDetailsUsingView');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error fetching product details', error: err });
    }
});

// Endpoint to list user addresses
app.get('/user-addresses', async (req, res) => {
    try {
        const { userID } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, userID)
            .execute('spListUserAddresses');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error listing user addresses', error: err});
    }
});

// Endpoint to list user orders
app.get('/user-orders', async (req, res) => {
    try {
        const { UserID } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, UserID)
            .execute('spListUserOrders');

        const orders = result.recordsets[0];
        const orderDetails = result.recordsets[1];

        const userOrders = orders.map(order => {
            const details = orderDetails.filter(detail => detail.order_id === order.order_id);
            return {
                order_id: order.order_id,
                date: order.date,
                total_amount: order.total_amount,
                details: details
            };
        });

        res.status(200).send({message: userOrders, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error listing user orders', error: err});
    }
});

// Endpoint to remove product from cart
app.delete('/remove-from-cart', async (req, res) => {
    try {
        const { UserID, ProductID, Quantity } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, UserID)
            .input('product_id', sql.UniqueIdentifier, ProductID)
            .input('quantity', sql.Int, Quantity)
            .execute('spRemoveFromCart');

        res.status(200).send({ message: 'Product removed from cart successfully', success: true });
    } 
	catch (error) {
        res.status(500).send({ error: 'Error removing product from cart', error: err });
    }
});

// Endpoint to remove product from favories
app.delete('/remove-from-favorites', async (req, res) => {
    try {
        const { UserID, ProductID } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, UserID)
            .input('product_id', sql.UniqueIdentifier, ProductID)
            .execute('spRemoveFromFavorites');

        res.status(200).send({ message: result.recordset[0].Message, success: true });
    } 
	catch (error) {
        res.status(500).send({ error: 'Error removing from favorites', error: err });
    }
});

// Endpoint to search product
app.get('/search-products', async (req, res) => {
    try {
        const { SearchTerm } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('searchTerm', sql.VarChar(100), SearchTerm)
            .execute('spSearchProductsByTitle');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error searching products by title', error: err });
    }
});

// Endpoint to sort products
app.get('/sort-products', async (req, res) => {
    try {
        const { sortOption } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('SortOption', sql.Int, sortOption)
            .execute('spSortProducts');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error sorting products', error: err });
    }
});

// Endpoint to set premium user 
app.put('/user-premium', async (req, res) => {
    try {
        const { user_id } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spSetUserPremium');
        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error updating user premium status', error: err });
    }
});

// Endpoint to update review
app.put('/reviews-update', async (req, res) => {
    try {
        const { review_id, user_id, new_comment, new_star } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('review_id', sql.UniqueIdentifier, review_id)
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('new_comment', sql.VarChar(512), new_comment)
            .input('new_star', sql.Int, new_star)
            .execute('spUpdateReview');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error updating review', error: err });
    }
});

// Endpoint to update user address
app.put('/update-user-address', async (req, res) => {
    try {
        const { address_id, user_id, name, surname, phone, address, address_title } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('address_id', sql.UniqueIdentifier, address_id)
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('name', sql.VarChar(32), name)
            .input('surname', sql.VarChar(32), surname)
            .input('phone', sql.VarChar(10), phone)
            .input('address', sql.VarChar(200), address)
            .input('address_title', sql.VarChar(30), address_title)
            .execute('spUpdateUserAddress');

        res.status(200).send({ message: result.recordset[0].Message, success: true });
    } 
	catch (error) {
        res.status(500).send({ error: 'Error updating user address', error: err });
    }
});

// Endpoint to view cart
app.get('/view-cart', async (req, res) => {
    try {
        const { user_id } = req.body;
        const pool = await poolPromise;       
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spViewCart');

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).send({ message: 'No cart available for the user', success: false });
        }

        const cartItems = result.recordsets[0];
        const totalAmount = result.recordsets[1][0].total_amount;

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error viewing cart', error: err });
    }
});

// Endpoint to order history
app.get('/order-history', async (req, res) => {
    try {
        const { user_id } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spViewOrderHistory');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error fetching order history', error: err });
    }
});

// Endpoint to place an order
app.post('/place-order', async (req, res) => {
    try {
        const { user_id } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spPlaceOrder');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error placing order', error: err });
    }
});

// Endpoint to view product reviews
app.get('/product-reviews', async (req, res) => {
    try {
        const { product_id } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('product_id', sql.UniqueIdentifier, product_id)
            .execute('spViewProductReviews');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (error) {
        res.status(500).send({ error: 'Error fetching product reviews', error: err });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);

});