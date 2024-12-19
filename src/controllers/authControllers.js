import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateRegister, validateLogin } from '../validations/authValidation.js';

export const registerVendor = async (req, res) => {
    // Log the request payload
    console.log(req.body);

    // Validate request data
    const { error } = validateRegister(req.body);
    if (error) {
        return res.status(400).send({ message: error.details[0].message });
    }

    const {
        firstName,
        lastName,
        storeName,
        storeId,
        address1,
        address2,
        city,
        state,
        country,
        postcode,
        phone,
        brandType,
        password,
        email,
    } = req.body;

    try {
        // Check if storeId already exists
        const checkStoreIdQuery = `SELECT COUNT(*) AS count FROM vendors WHERE store_id = ?`;
        const [checkResult] = await new Promise((resolve, reject) => {
            db.query(checkStoreIdQuery, [storeId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (checkResult.count > 0) {
            return res.status(400).send({ message: 'Store ID is already taken' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the vendor into the database
        const query = `
            INSERT INTO vendors 
            (first_name, last_name, store_name, store_id, address1, address2, city, state_county, country, postcode, store_phone, brand_type, password, email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            query,
            [
                firstName,
                lastName,
                storeName,
                storeId,
                address1,
                address2,
                city,
                state,
                country,
                postcode,
                phone,
                brandType,
                hashedPassword,
                email,
            ],
            (err, result) => {
                if (err) {
                    res.status(500).send({ message: 'Database error', error: err });
                } else {
                    res.status(200).send({ message: 'Vendor registered successfully!' });
                }
            }
        );
    } catch (error) {
        res.status(500).send({ message: 'Server error', error });
    }
};


export const loginVendor = (req, res) => {
    // Validate request data
    const { error } = validateLogin(req.body);
    if (error) {
        return res.status(400).send({ message: error.details[0].message });
    }

    const { email, password } = req.body;

    const query = 'SELECT * FROM vendors WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            res.status(500).send({ message: 'Database error', error: err });
        } else if (results.length === 0) {
            res.status(404).send({ message: 'Vendor not found!' });
        } else {
            const vendor = results[0];
            const isPasswordMatch = await bcrypt.compare(password, vendor.password);

            if (isPasswordMatch) {
                // Create a token
                const token = jwt.sign({ id: vendor.id }, 'your_secret_key', { expiresIn: '1h' });

                // Send only required fields
                const vendorData = {
                    store_id: vendor.store_id,
                    store_name: vendor.store_name,
                    email: vendor.email,
                    brand_type: vendor.brand_type,
                    first_name: vendor.first_name,
                    last_name: vendor.last_name,
                    store_phone: vendor.store_phone,
                };

                res.status(200).send({
                    message: 'Login successful',
                    token,
                    vendor: vendorData, // Send limited vendor data
                });
            } else {
                res.status(401).send({ message: 'Incorrect password!' });
            }
        }
    });
};




// Check Store ID
export const checkStoreId = async (req, res) => {
    const { storeId } = req.params;

    if (!storeId) {
        return res.status(400).send({ message: 'Store ID is required.' });
    }

    try {
        const query = 'SELECT COUNT(*) AS count FROM vendors WHERE store_id = ?';
        const [result] = await new Promise((resolve, reject) => {
            db.query(query, [storeId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (result.count > 0) {
            return res.status(200).send({ exists: true, message: 'Store ID is already taken.' });
        }

        return res.status(200).send({ exists: false, message: 'Store ID is available.' });
    } catch (error) {
        console.error('Error checking store ID:', error);
        return res.status(500).send({ message: 'Server error', error });
    }
};

// Check Store Email
export const checkEmail = async (req, res) => {
    const { email } = req.params;

    if (!email) {
        return res.status(400).send({ message: 'Email is required.' });
    }

    try {
        const query = 'SELECT COUNT(*) AS count FROM vendors WHERE email = ?';
        const [result] = await new Promise((resolve, reject) => {
            db.query(query, [email], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (result.count > 0) {
            return res.status(200).send({ exists: true, message: 'Email is already taken.' });
        }

        return res.status(200).send({ exists: false, message: 'Email is available.' });
    } catch (error) {
        console.error('Error checking Email:', error);
        return res.status(500).send({ message: 'Server error', error });
    }
};