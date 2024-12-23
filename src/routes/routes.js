import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadImages, getAllImages, createProduct, getProducts, fetchVendorProducts, updateProduct, deleteProduct, getProductBySlug } from '../controllers/controllers.js';
import { authenticate } from '../middleware/authmiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/uploadImages', authenticate, upload.array('image', 10), uploadImages);

router.get('/images', authenticate, getAllImages);

router.post('/createproduct', authenticate, createProduct);

router.get('/products', getProducts);

// Fetch a single product by ID
router.get('/products/:slug', authenticate, getProductBySlug);

// Update a product
router.put('/products/:slug', authenticate, updateProduct);
router.get('/vendor-products', authenticate, fetchVendorProducts);

// Delete a product
router.delete('/products/:id', authenticate, deleteProduct);

export default router;