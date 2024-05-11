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

        res.status(201).send({ message: 'User registered successfully' });
    } catch (err) {
        // E-posta zaten varsa veya başka bir veritabanı hatası oluşursa
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

      res.status(201).send({ message: 'User registered successfully with Google Auth' });
  } catch (err) {
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



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

});