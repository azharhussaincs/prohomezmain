import db from '../config/db.js';
import { validateProduct } from '../validations/validation.js';

export const uploadImages = (req, res) => {
    console.log('Received files:', req.files);

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
    }

    const images = req.files.map(file => file.filename);

    const values = images.map(image => [image, null]); 

    const sql = 'INSERT INTO `media` (`image`, `date`) VALUES ?';

    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: 'Error uploading images.' });
        }
        return res.json({
            status: "Success",
            images: images
        });
    });
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
export const uploadProduct = (req, res) => {
    const sql = 'SELECT * FROM media';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching media.' });
        }
        return res.json(result);
    });
};

// Controller to store product details
export const createProduct = (req, res) => {
    const { error } = validateProduct(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const {
        productName,
        productPrice,
        discountedPrice,
        productDescription,
        selectedCategory,
        selectedImages,
    } = req.body;

    if (!Array.isArray(selectedImages) || selectedImages.length === 0) {
        return res.status(400).json({ message: 'Selected images cannot be empty.' });
    }

    const featureImage = selectedImages[0]; // Extract the first image as the feature image
    const imagesJson = JSON.stringify(selectedImages); // Convert the array of images to JSON format

    const sql = `
        INSERT INTO products (productName, productPrice, discountedPrice, productDescription, selectedCategory, selectedImages, featureImage)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            productName,
            productPrice,
            discountedPrice,
            productDescription,
            selectedCategory,
            imagesJson,
            featureImage,
        ],
        (err, result) => {
            if (err) {
                console.error('Error inserting product:', err.message);
                return res.status(500).json({ message: 'Error storing product details.' });
            }
            res.status(201).json({
                message: 'Product created successfully!',
                productId: result.insertId,
            });
        }
    );
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
