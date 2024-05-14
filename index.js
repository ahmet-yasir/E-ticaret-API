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

// Kullanıcı Kayıt Endpoint'i
app.post('/register', async (req, res) => {
    const { name, surname, email, password } = req.body;

    // Şifreyi hash'le
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
            res.status(201).send({ message: result.recordset[0].Message });
        } else {
            res.status(400).send({ message: 'Invalid email' });
        }
    } catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    }
});

// Google Auth ile Kullanıcı Kayıt Endpoint'i
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
            res.status(201).send({ message: result.recordset[0].Message });
        } else {
            res.status(400).send({ message: 'Invalid email' });
        }
    } 
    catch (err) {
        // Eğer aynı e-posta adresi ile zaten bir kayıt varsa veya başka bir veritabanı hatası olursa
        res.status(500).send(err.message);
    }
});

// Kullanıcı Giriş Endpoint'i (E-posta ve Şifre ile)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Şifreyi hash'le
  const hashedPassword = md5(password);

  try {
      const pool = await poolPromise;
      const result = await pool.request()
          .input('email', sql.VarChar, email)
          .input('password', sql.VarChar, hashedPassword)
          .execute('spLoginUserWithPassword');

      if (result.recordset.length > 0 && result.recordset[0].LoginSuccess === 1) {
          res.status(200).send({ message: result.recordset[0].Message });
      } else {
          res.status(401).send({ message: 'Invalid email or password' });
      }
  } catch (err) {
    console.log(err);
      res.status(500).send({ message: 'Error logging in', error: err });
  }
});

// Kullanıcı Giriş Endpoint'i (Google Authentication ile)
app.post('/login-google', async (req, res) => {
  const { email, token } = req.body;

  try {
      const pool = await poolPromise;
      const result = await pool.request()
          .input('email', sql.VarChar, email)
          .input('token', sql.VarChar, token)
          .execute('spLoginUserWithGoogleAuth');

      if (result.recordset[0].LoginSuccess === 1) {
          res.status(200).send({ message: result.recordset[0].Message });
      } else {
          res.status(401).send({ message: result.recordset[0].Message });
      }
  } catch (err) {
      res.status(500).send({ message: 'Error logging in with Google', error: err.message });
  }
});

// Kullanıcı Adres Ekleme Endpoint'i
app.post('/add-address', async (req, res) => {
    const { user_id, name, surname, phone, address, address_title } = req.body;

    try {
        // Kullanıcı ID'sinin geçerli olup olmadığını kontrol etmek için veritabanı sorgusu yapın
        const pool = await poolPromise;
        const userCheckResult = await pool.request()
            .input('user_id', sql.Int, user_id)
            .query('SELECT 1 FROM Users WHERE user_id = @user_id');

        if (userCheckResult.recordset.length === 0) {
            return res.status(400).send({ message: 'Geçersiz kullanıcı ID.', error: 'Invalid user ID' });
        }

        // Adresi eklemek için stored procedure çağrısı yapın
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('name', sql.VarChar(32), name)
            .input('surname', sql.VarChar(32), surname)
            .input('phone', sql.VarChar(10), phone)
            .input('address', sql.VarChar(200), address)
            .input('address_title', sql.VarChar(30), address_title)
            .execute('spAddAddress');

        // Başarı mesajını yanıt olarak gönderin
        res.status(201).send({ message: result.recordset[0].Message });
    } catch (err) {
        // Hata durumunda hata mesajını yanıt olarak gönderin
        console.error('Adres ekleme hatası:', err);
        res.status(500).send({ message: 'Adres eklenirken bir hata oluştu', error: err.message });
    }
});

// Favori Ekleme Endpoint'i
app.post('/add-favorite', async (req, res) => {
    const { user_id, product_id } = req.body;

    try {
        // Yeni favori olarak ürünü ekleyin
        const pool = await poolPromise;  
        const insertResult = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('product_id', sql.Int, product_id)
            .execute('spAddFavorite');

        // Başarı mesajını yanıt olarak gönderin
        res.status(201).send({ message: insertResult.recordset[0].Message });
    } catch (err) {
        // Hata durumunda hata mesajını yanıt olarak gönderin
        console.error('Favori eklenirken bir hata oluştu:', err);
        res.status(500).send({ message: 'Favori eklenirken bir hata oluştu', error: err.message });
    }
});

// Yorum Ekleme Endpoint'i
app.post('/add-review', async (req, res) => {
    const { product_id, user_id, review_comment, review_star } = req.body;

    try {
        // Yorumu eklemek için prosedürü çağırın
        const pool = await poolPromise;
        const insertResult = await pool.request()
            .input('product_id', sql.Int, product_id)
            .input('user_id', sql.Int, user_id)
            .input('review_comment', sql.VarChar(512), review_comment)
            .input('review_star', sql.Int, review_star)
            .execute('spAddReview');

        // Başarı mesajını yanıt olarak gönderin
        res.status(201).send({ message: insertResult.recordset[0].Message });
    } catch (err) {
        // Hata durumunda hata mesajını yanıt olarak gönderin
        console.error('Yorum eklenirken bir hata oluştu:', err);
        res.status(500).send({ message: 'Yorum eklenirken bir hata oluştu', error: err.message });
    }
});

// Sepete Ürün Ekleme Endpoint'i
app.post('/add-to-cart', async (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    try {
        // Ürünü sepete ekle veya miktarını güncelle
        const pool = await poolPromise;
        const cartUpdateResult = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('product_id', sql.Int, product_id)
            .input('quantity', sql.Int, quantity)
            .execute('spAddToCart');

        // Başarı mesajını yanıt olarak gönderin
        res.status(200).send({ message: 'Ürün başarıyla sepete eklendi.' });
    } catch (err) {
        // Hata durumunda hata mesajını yanıt olarak gönderin
        console.error('Ürün sepete eklenirken bir hata oluştu:', err);
        console.log(err);
        res.status(500).send({ message: 'Ürün sepete eklenirken bir hata oluştu.', error: err.message });
    }
});

// Kullanıcı şifresini değiştirme Endpoint'i
app.put('/changePassword', async (req, res) => {
    const { user_id, new_password } = req.body;

    // Şifreyi hash'le
    const newhashedPassword = md5(new_password);

    try {
        const pool = await poolPromise;
        const chancePasswordResult = await pool.request()
        await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('new_password', sql.VarChar, new_password)
            .execute('spChangePassword');

        // Şifre başarıyla güncellendi
        res.status(200).send({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Şifre değiştirme hatası:', err);
        console.log(err);
        res.status(500).send({ message: 'Şifre değiştirme hatası' });
    }
});

// Kullanıcı adresini silme Endpoint'i
app.delete('/deleteAddress', async (req, res) => {
    const { address_id, user_id } = req.body;

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('address_id', sql.Int, address_id)
            .input('user_id', sql.Int, user_id)
            .execute('spDeleteAddress');

        if (result.rowsAffected[0] > 0) {
            // Adres başarıyla silindi
            res.status(200).send({ message: 'Address deleted successfully' });
        } else {
            // Adres bulunamadı
            res.status(404).send({ message: 'Address not found or does not belong to user' });
        }
    } catch (err) {
        console.error('Adres silme hatası:', err);
        res.status(500).send({ message: 'Adres silme hatası' });
    }
});

// Kullanıcı yorumunu silme Endpoint'i
app.delete('/deleteReview', async (req, res) => {
    const { review_id, user_id } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('review_id', sql.Int, review_id)
            .input('user_id', sql.Int, user_id)
            .execute('spDeleteReview');

        if (result.rowsAffected[0] > 0) {
            res.status(200).send({ message: 'Review deleted successfully' });
        } else {
            res.status(404).send({ message: 'Review not found or does not belong to user' });
        }
    } catch (err) {
        res.status(500).send({ message: 'Error deleting review', error: err.message });
    }
});


// Ürün Filtreleme Endpoint'i
app.get('/filter-products', async (req, res) => {
    try {
        const { producerID, categoryID, minPrice, maxPrice } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProducerID', sql.Int, producerID)
            .input('CategoryID', sql.Int, categoryID)
            .input('MinPrice', sql.Money, minPrice)
            .input('MaxPrice', sql.Money, maxPrice)
            .execute('spFilterProducts');

        // Sonuçları döndürme
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error filtering products:', error.message);
        res.status(500).json({ error: 'Error filtering products' });
    }
});

// Ürün Detayları ve Yorumları Getiren Endpoint
app.get('/product-details-and-reviews/:productId', async (req, res) => {
    try {
        const { productID } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('product_id', sql.Int, productID)
            .execute('spGetProductDetailsAndReviews');

        // Prosedürden dönen sonuçları alın
        const productDetailsAndReviews = result.recordset[0];

        // Ürün bulunamazsa hata döndür
        if (!productDetailsAndReviews) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Sonuçları döndür
        res.status(200).json(productDetailsAndReviews);
    } catch (error) {
        console.error('Error fetching product details and reviews:', error.message);
        res.status(500).json({ error: 'Error fetching product details and reviews' });
    }
});

// Ürün Detayları Endpoint'i
app.get('/product-details', async (req, res) => {
    try {
        const { productID } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('product_id', sql.Int, productID)
            .execute('spGetProductDetailsUsingView');

        // Sonuçları döndürme
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching product details:', error.message);
        res.status(500).json({ error: 'Error fetching product details' });
    }
});

// Kullanıcı Adreslerini Listeleme Endpoint'i
app.get('/user-addresses', async (req, res) => {
    try {
        const { userID } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, userID)
            .execute('spListUserAddresses');

        // Sonuçları döndürme
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error listing user addresses:', error.message);
        res.status(500).json({ error: 'Error listing user addresses' });
    }
});

// Kullanıcı Siparişlerini Listeleme Endpoint'i
app.get('/user-orders', async (req, res) => {
    try {
        const { UserID } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, UserID)
            .execute('spListUserOrders');

        // Siparişleri ve detaylarını ayrı ayrı diziye ayırma
        const orders = result.recordsets[0];
        const orderDetails = result.recordsets[1];

        // Sonuçları düzenleme
        const userOrders = orders.map(order => {
            const details = orderDetails.filter(detail => detail.order_id === order.order_id);
            return {
                order_id: order.order_id,
                date: order.date,
                total_amount: order.total_amount,
                details: details
            };
        });

        // Sonuçları döndürme
        res.status(200).json(userOrders);
    } catch (error) {
        console.error('Error listing user orders:', error.message);
        res.status(500).json({ error: 'Error listing user orders' });
    }
});
// Sepetten Ürün Kaldırma Endpoint'i
app.delete('/remove-from-cart', async (req, res) => {
    try {
        const { UserID, ProductID, Quantity } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, UserID)
            .input('product_id', sql.Int, ProductID)
            .input('quantity', sql.Int, Quantity)
            .execute('spRemoveFromCart');

        // İşlem başarılıysa başarılı yanıt döndürme
        res.status(200).json({ message: 'Product removed from cart successfully' });
    } catch (error) {
        console.error('Error removing product from cart:', error.message);
        res.status(500).json({ error: 'Error removing product from cart' });
    }
});

// Favorilerden Ürün Silme Endpoint'i
app.delete('/remove-from-favorites', async (req, res) => {
    try {
        const { UserID, ProductID } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, UserID)
            .input('product_id', sql.Int, ProductID)
            .execute('spRemoveFromFavorites');

        // Mesajı döndürme
        res.status(200).json({ message: result.recordset[0].Message });
    } catch (error) {
        console.error('Error removing from favorites:', error.message);
        res.status(500).json({ error: 'Error removing from favorites' });
    }
});

// Ürün Arama Endpoint'i
app.get('/search-products', async (req, res) => {
    try {
        const { SearchTerm } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('searchTerm', sql.VarChar(100), SearchTerm)
            .execute('spSearchProductsByTitle');

        // Sonuçları döndürme
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error searching products by title:', error.message);
        res.status(500).json({ error: 'Error searching products by title' });
    }
});

// Ürünleri sıralama endpoint'i
app.get('/sort-products', async (req, res) => {
    try {
        const { sortOption } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('SortOption', sql.Int, sortOption)
            .execute('spSortProducts');

        // Sonuçları döndürme
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error sorting products:', error.message);
        res.status(500).json({ error: 'Error sorting products' });
    }
});

// Kullanıcıyı premium yapma endpoint'i
app.put('/user/premium/:user_id', async (req, res) => {
    try {
        const { user_id } = req.body;
        // Veritabanı bağlantısını al
        const pool = await poolPromise;
        // Prosedürü çağır
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .execute('spSetUserPremium');
        // Başarılı yanıtı döndür
        res.status(200).json({ message: 'User premium status updated successfully' });
    } catch (error) {
        // Hata durumunda uygun yanıtı döndür
        console.error('Error updating user premium status:', error.message);
        res.status(500).json({ error: 'Error updating user premium status' });
    }
});

// Yorum güncelleme endpoint'i
app.put('/reviews/:review_id', async (req, res) => {
    try {
        const { review_id, user_id, new_comment, new_star } = req.body;
        // Veritabanı bağlantısını al
        const pool = await poolPromise;
        // Prosedürü çağır
        const result = await pool.request()
            .input('review_id', sql.Int, review_id)
            .input('user_id', sql.Int, user_id)
            .input('new_comment', sql.VarChar(512), new_comment)
            .input('new_star', sql.Int, new_star)
            .execute('spUpdateReview');

        // Başarılı yanıtı döndür
        res.status(200).json({ message: 'Review updated successfully' });
    } catch (error) {
        // Hata durumunda uygun yanıtı döndür
        console.error('Error updating review:', error.message);
        res.status(500).json({ error: 'Error updating review' });
    }
});

// Adres güncelleme endpoint'i
app.put('/update-user-address/:address_id', async (req, res) => {
    try {
        const { address_id, user_id, name, surname, phone, address, address_title } = req.body;

        // Veritabanında adresi güncelle
        const pool = await poolPromise;
        const result = await pool.request()
            .input('address_id', sql.Int, address_id)
            .input('user_id', sql.Int, user_id)
            .input('name', sql.VarChar(32), name)
            .input('surname', sql.VarChar(32), surname)
            .input('phone', sql.VarChar(10), phone)
            .input('address', sql.VarChar(200), address)
            .input('address_title', sql.VarChar(30), address_title)
            .execute('spUpdateUserAddress');

        // Sonucu döndür
        res.status(200).json({ message: result.recordset[0].Message });
    } catch (error) {
        console.error('Error updating user address:', error.message);
        res.status(500).json({ error: 'Error updating user address' });
    }
});

// Cart View Endpoint
app.get('/view-cart/:user_id', async (req, res) => {
    try {
        const { user_id } = req.body;
        // Veritabanı bağlantısı
        const pool = await poolPromise;       
        // Sepet bilgilerini almak için stored procedure çağrısı
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .execute('spViewCart');

        // Eğer sepette ürün yoksa uygun bir mesaj döndür
        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).json({ message: 'No cart available for the user' });
        }

        // Sepet ürünlerini ve toplam tutarı döndür
        const cartItems = result.recordsets[0];
        const totalAmount = result.recordsets[1][0].total_amount;

        res.status(200).json({ items: cartItems, totalAmount: totalAmount });
    } catch (error) {
        console.error('Error viewing cart:', error.message);
        res.status(500).json({ error: 'Error viewing cart' });
    }
});

app.get('/order-history/:userId', async (req, res) => {
    try {
        const { user_id } = req.body;

        // Veritabanı bağlantısı
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .execute('spViewOrderHistory');

        // Sonuçları döndürme
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching order history:', error.message);
        res.status(500).json({ error: 'Error fetching order history' });
    }
});

// Endpoint to place an order
app.post('/place-order', async (req, res) => {
    try {
        const { user_id } = req.body;

        // Database connection
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .execute('spPlaceOrder');

        // Return success message and order ID
        res.status(200).json({
            message: result.recordset[0].Message,
            orderId: result.recordset[0].OrderId
        });
    } catch (error) {
        console.error('Error placing order:', error.message);
        res.status(500).json({ error: 'Error placing order' });
    }
});

// Endpoint to view product reviews
app.get('/product-reviews', async (req, res) => {
    try {
        const { product_id } = req.body;

        // Database connection
        const pool = await poolPromise;
        const result = await pool.request()
            .input('product_id', sql.Int, product_id)
            .execute('spViewProductReviews');

        // Return product reviews
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching product reviews:', error.message);
        res.status(500).json({ error: 'Error fetching product reviews' });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

});