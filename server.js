import express from 'express';
import mysql from 'mysql';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// MySQL Database connection
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

// Test DB connection
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to the database.');
});

// Configure Multer to handle multiple files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Endpoint for uploading multiple images
app.post('/uploadImages', upload.array('image', 10), (req, res) => {
    console.log('Received files:', req.files);
    
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
    }

    const images = req.files.map(file => file.filename);
    console.log('Files to insert into DB:', images);

    // Prepare the data for bulk insertion (image and current timestamp)
    const values = images.map(image => [image, null]); // null for `date`, it will use CURRENT_TIMESTAMP in SQL

    // Insert images into the database
    const sql = 'INSERT INTO `media` (`image`, `date`) VALUES ?';

    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: 'Error uploading images.' });
        }
        console.log('Database Insert Success:', result);
        return res.json({
            status: "Success",
            images: images
        });
    });
});

// Endpoint to upload product data and images
app.post('/uploadproduct', upload, (req, res) => {
    const { productName, productPrice, discountedPrice, productDescription, selectedCategory } = req.body;
    
    // Validate if all required fields are present
    if (!productName || !productPrice || !discountedPrice || !productDescription || !selectedCategory || req.files.length === 0) {
        return res.status(400).json({ error: 'Please provide all fields and images.' });
    }

    // Map images to their file paths
    const imagePaths = req.files.map(file => `/images/${file.filename}`);

    // Insert product data into the database
    const query = 'INSERT INTO products (name, price, discounted_price, description, category, images) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [productName, productPrice, discountedPrice, productDescription, selectedCategory, JSON.stringify(imagePaths)];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error inserting product:', err);
            return res.status(500).json({ error: 'Error inserting product data.' });
        }
        return res.status(200).json({ message: 'Product uploaded successfully!', productId: result.insertId });
    });
});

// Endpoint to fetch all uploaded media
app.get("/images", (req, res) => {
    const sql = 'SELECT * FROM media';
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching media.' });
        }
        return res.json(result);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
