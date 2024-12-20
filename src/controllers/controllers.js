import db from '../config/db.js';
import { executeQuery } from '../reuseable/functions.js';
import { validateProduct } from '../validations/validation.js';

export const uploadImages = async (req, res) => {
    console.log('Received files:', req.files);

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
    }

    try {
        const images = req.files.map((file) => file.filename);
        const values = images.map((image) => [image, new Date()]); // Add date

        const sql = 'INSERT INTO media (image, date) VALUES ?';
        await executeQuery(sql, [values]); // Use reusable query function

        return res.json({
            status: 'Success',
            images,
        });
    } catch (err) {
        console.error('Error uploading images:', err);
        return res.status(500).json({ message: 'Failed to upload images.' });
    }
};


export const getAllImages = (req, res) => {
    const sql = 'SELECT * FROM media';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching media.' });
        }
        return res.json(result);
    });
};

// Controller to store product details
export const createProduct = async (req, res) => {
    const { error } = validateProduct(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const {
        productName,
        productPrice,
        discountedPrice = null,
        productDescription,
        selectedCategory,
        selectedImages,
    } = req.body;

    if (!Array.isArray(selectedImages) || selectedImages.length === 0) {
        return res.status(400).json({ message: 'Selected images cannot be empty.' });
    }

    const featureImage = selectedImages[0];
    const imagesJson = JSON.stringify(selectedImages);

    try {
        const { store_id } = req.user;
        const userQuery = `SELECT brand_type FROM vendors WHERE store_id = ?`;
        const userResult = await executeQuery(userQuery, [store_id]);

        if (userResult.length === 0) {
            return res.status(404).json({ message: 'Vendor not found.' });
        }

        const { brand_type: brandType } = userResult[0];

        const sql = `
            INSERT INTO products (
                productName, 
                productPrice, 
                discountedPrice, 
                productDescription, 
                selectedCategory, 
                mainCategory, 
                selectedImages, 
                featureImage,
                storeId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await executeQuery(sql, [
            productName,
            productPrice,
            discountedPrice,
            productDescription,
            selectedCategory,
            brandType,
            imagesJson,
            featureImage,
            store_id,
        ]);

        res.status(201).json({
            message: 'Product created successfully!',
            productId: result.insertId,
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ message: 'Failed to create product.' });
    }
};


// Fetch all products
export const getProducts = (req, res) => {
    const sql = 'SELECT * FROM products'; // SQL query to fetch all products
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ message: 'Failed to fetch products.' });
        }
        res.status(200).json(results); // Send products as JSON
    });
};