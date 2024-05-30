import sql from 'mssql';
import {poolPromise} from '../connection.js';

// Endpoint to add product on cart
export const addToCart = async (req, res) => {
    try {
        const { user_id, product_id, quantity } = req.body;
        const pool = await poolPromise;
        const cartUpdateResult = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('product_id', sql.UniqueIdentifier, product_id)
            .input('quantity', sql.Int, quantity)
            .execute('spAddToCart');
            
        res.status(200).send({ message: "ürün sepete eklendi.", success: true });
    } 
	catch (err) {
        res.status(500).send({ message: 'Ürün sepete eklenirken bir hata oluştu.', error: err });
    }
};

// Endpoint to add favorite
export const addToFavorite = async (req, res) => {
    try {
        const { user_id, product_id } = req.body;

        const pool = await poolPromise;  
        const insertResult = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('product_id', sql.UniqueIdentifier, product_id)
            .execute('spAddFavorite');

        res.status(201).send({ message: "Ürün favorilere başarıyla eklendi.", success: true });
    } 
	catch (err) {
        res.status(500).send({ message: 'Favori eklenirken bir hata oluştu!', error: err });
    }
};

// Endpoint to remove product from cart
export const removeFromCart = async (req, res) => {
    try {
        const { UserID, ProductID, Quantity } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, UserID)
            .input('product_id', sql.UniqueIdentifier, ProductID)
            .input('quantity', sql.Int, Quantity)
            .execute('spRemoveFromCart');

        res.status(200).send({ message: 'Ürün sepetten başarıyla kaldırıldı.', success: true });
    } 
	catch (err) {
        res.status(500).send({ error: 'Error removing product from cart', error: err });
    }
};

// Endpoint to remove product from favories
export const removeFromFavorites =  async (req, res) => {
    try {
        const { UserID, ProductID } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, UserID)
            .input('product_id', sql.UniqueIdentifier, ProductID)
            .execute('spRemoveFromFavorites');

        res.status(200).send({ message: 'Ürün farvorilerden başarıyla kaldırıldı.', success: true });
    } 
	catch (err) {
        res.status(500).send({ error: 'Error removing from favorites', error: err });
    }
};

// Endpoint to view cart
export const viewCart = async (req, res) => {
    try {
        const { user_id } = req.body;

        const pool = await poolPromise;       
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spViewCart');

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).send({ message: 'No cart available for the user', success: false });
        }

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error viewing cart', error: err });
    }
};

// Endpoint to place an order
export const placeOrder = async (req, res) => {
    try {
        const { user_id } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spPlaceOrder');

        res.status(200).send({message: 'Sipariş başarıyla oluşturuldu.', success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error placing order', error: err });
    }
};
