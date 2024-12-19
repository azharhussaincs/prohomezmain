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
    // Validate incoming request
    const { error } = validateProduct(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    // Destructure request body
    const {
        productName,
        productPrice,
        discountedPrice = null, // Default to null if not provided
        productDescription,
        selectedCategory,
        selectedImages,
        mainCategory,
    } = req.body;

    // Ensure selectedImages is a valid non-empty array
    if (!Array.isArray(selectedImages) || selectedImages.length === 0) {
        return res.status(400).json({ message: 'Selected images cannot be empty.' });
    }

    // Extract the first image as the feature image and convert images to JSON
    const featureImage = selectedImages[0];
    const imagesJson = JSON.stringify(selectedImages);

    // SQL query to insert product
    const sql = `
        INSERT INTO products (
            productName, 
            productPrice, 
            discountedPrice, 
            productDescription, 
            selectedCategory, 
            mainCategory, 
            selectedImages, 
            featureImage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Execute the query
    db.query(
        sql,
        [
            productName,
            productPrice,
            discountedPrice,
            productDescription,
            selectedCategory,
            mainCategory,
            imagesJson,
            featureImage,
        ],
        (err, result) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ message: 'Error storing product details. Please try again later.' });
            }

            // Success response
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