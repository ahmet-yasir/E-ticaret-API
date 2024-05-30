import sql from 'mssql';
import {poolPromise} from '../connection.js';
import md5 from 'md5';

// Endpoint to register with Google Authentication
export const registerWithGoogle = async (req, res) => {
    try {
		const { name, surname, email, token } = req.body;

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
};

// Endpoint to register with email and password
export const registerWithEmail =  async (req, res) => {
    try {
		const { name, surname, email, password } = req.body;

		const hashedPassword = md5(password);

        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.VarChar, name)
            .input('surname', sql.VarChar, surname)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .execute('spAddUserWithPassword');

        if (result.recordset.length > 0 && result.recordset[0].RegisterSuccess === 1) {
            res.status(201).send({ message: result.recordset[0].Message, success: true });
        } 
		else {
            res.status(400).send({ message: 'Invalid email', success: false });
        }
    } 
	catch (err) {
        res.status(500).send({message: 'Kayıt olurken bir hata oluştu', error: err});
    }
};

// Endpoint to login with Google Authentication
export const loginWithGoogle = async (req, res) => {
	try {
		const { email, token } = req.body;

		const pool = await poolPromise;
		const result = await pool.request()
			.input('email', sql.VarChar, email)
			.input('token', sql.VarChar, token)
			.execute('spLoginUserWithGoogleAuth');

		if (result.recordset[0].LoginSuccess === 1) {
			res.status(200).send({ message: result.recordset[0].Message, success: true });
		} 
		else {
			res.status(401).send({ message: result.recordset[0].Message, success: false});
		}
	} 
	catch (err) {
		res.status(500).send({ message: 'Error logging in with Google', error: err.message });
	}
};

// Endpoint to login with email and password
export const loginWithPassword = async (req, res) => {
    try {
		const { email, password } = req.body;
  
		const hashedPassword = md5(password);
        const pool = await poolPromise;
        const result = await pool.request()
			.input('email', sql.VarChar, email)
			.input('password', sql.VarChar, hashedPassword)
			.execute('spLoginUserWithPassword');
  
		if (result.recordset.length > 0 && result.recordset[0].LoginSuccess === 1) {
			res.status(200).send({ message: result.recordset[0].Message, success: true });
		} 
		else {
			res.status(401).send({ message: 'Invalid email or password', success: false});
		}
    } 
    catch (err) {
        res.status(500).send({ message: 'Error logging in', error: err });
    }	
};
