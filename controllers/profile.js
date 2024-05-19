import sql from 'mssql';
import {poolPromise} from '../connection.js';

// Endpoint to add address
export const addAddress = async (req, res) => {
    try {
        const { user_id, name, surname, phone, address, address_title } = req.body;

        const pool = await poolPromise;
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
};

// Endpoint to chacge password
export const chancePassword = async (req, res) => {
    try {
        const { user_id, new_password } = req.body;

        const newhashedPassword = md5(new_password);

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
};

// Endpoint to delete address
export const deleteAddress = async (req, res) => {
    try {
        const { address_id, user_id } = req.body;

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
};

// Endpoint to list user addresses
export const userAddresses = async (req, res) => {
    try {
        const { userID } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, userID)
            .execute('spListUserAddresses');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error listing user addresses', error: err});
    }
};

// Endpoint to list user orders
export const userOrders = async (req, res) => {
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
	catch (err) {
        res.status(500).send({ error: 'Error listing user orders', error: err});
    }
};

// Endpoint to set premium user 
export const userPremium = async (req, res) => {
    try {
        const { user_id } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spSetUserPremium');
        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error updating user premium status', error: err });
    }
};

// Endpoint to update user address
export const updateUserAddress = async (req, res) => {
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
	catch (err) {
        res.status(500).send({ error: 'Error updating user address', error: err });
    }
};

// Endpoint to order history
export const orderHistory = async (req, res) => {
    try {
        const { user_id } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.UniqueIdentifier, user_id)
            .execute('spViewOrderHistory');

        res.status(200).send({message: result.recordset, success: true});
    } 
	catch (err) {
        res.status(500).send({ error: 'Error fetching order history', error: err });
    }
};
