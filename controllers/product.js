import sql from 'mssql';
import {poolPromise} from '../connection.js';

// Endpoint to add review
export const addReview = async (req, res) => {
    try {
        const { product_id, user_id, review_comment, review_star } = req.body;

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
};

// Endpoint to delete review
export const deleteReview = async (req, res) => {
    try {
        const { review_id, user_id } = req.body;

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
};

// Endpoint to filter product
export const filterProduct = async (req, res) => {
    try {
        const { producerID, categoryID, minPrice, maxPrice } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProducerID', sql.UniqueIdentifier, producerID)
            .input('CategoryID', sql.UniqueIdentifier, categoryID)
            .input('MinPrice', sql.Money, minPrice)
            .input('MaxPrice', sql.Money, maxPrice)
            .execute('spFilterProducts');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error filtering products', error: err });
    }
};

// Endpoint to view product details and reviews
export const viewProductPage = async (req, res) => {
    try {
        const { productID } = req.params;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('product_id', sql.UniqueIdentifier, productID)
            .execute('spGetProductDetailsAndReviews');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error fetching product details and reviews', error: err });
    }
};

// Endpoint to view product details
export const productDetails = async (req, res) => {
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
};

// Endpoint to search product
export const searchProduct = async (req, res) => {
    try {
        const { SearchTerm } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('searchTerm', sql.VarChar(100), SearchTerm)
            .execute('spSearchProductsByTitle');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error searching products by title', error: err });
    }
};

// Endpoint to sort products
export const shortProducts = async (req, res) => {
    try {
        const { sortOption } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('SortOption', sql.Int, sortOption)
            .execute('spSortProducts');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error sorting products', error: err });
    }
};

// Endpoint to update review
export const updateReview = async (req, res) => {
    try {
        const { review_id, user_id, new_comment, new_star } = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('review_id', sql.UniqueIdentifier, review_id)
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('new_comment', sql.VarChar(512), new_comment)
            .input('new_star', sql.Int, new_star)
            .execute('spUpdateReview');

        res.status(200).send({message: "Yorum başarıyla güncellendi.", success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error updating review', error: err });
    }
};

// Endpoint to view product reviews
export const productReviews = async (req, res) => {
    try {
        const { product_id } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('product_id', sql.UniqueIdentifier, product_id)
            .execute('spViewProductReviews');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error fetching product reviews', error: err });
    }
};
