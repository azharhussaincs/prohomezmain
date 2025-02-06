import db from '../config/db.js';
import { dbQuery, executeQuery } from '../reuseable/functions.js';
import { orderValidationSchema, validateProduct } from '../validations/validation.js';
import slugify from 'slugify';

// Store Images
export const uploadImages = async (req, res) => {

    // Extract store_id from req.user
    const { store_id } = req.user;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
    }

    try {
        // Map through files to get filenames and add store_id and date
        const images = req.files.map((file) => file.filename);
        const values = images.map((image) => [image, store_id, new Date()]);

        // Updated SQL query to include store_id column
        const sql = 'INSERT INTO media (image, store_id, date) VALUES ?';
        await executeQuery(sql, [values]);

        return res.json({
            status: 'Success',
            images,
        });
    } catch (err) {
        console.error('Error uploading images:', err);
        return res.status(500).json({ message: 'Failed to upload images.' });
    }
};

// Get All Images
export const getAllImages = (req, res) => {
    // Extract store_id from req.user
    const { store_id } = req.user;
    const isAdmin = req.query.isAdmin;

    if (!store_id) {
        return res.status(400).json({ message: 'Store ID is required.' });
    }
    let sql;
    if(isAdmin == 1){
        sql = 'SELECT * FROM media';
    } else{
        sql = 'SELECT * FROM media WHERE store_id = ?';
    }

    db.query(sql, [store_id], (err, result) => {
        if (err) {
            console.error('Error fetching media:', err);
            return res.status(500).json({ message: 'Error fetching media.' });
        }

        return res.json(result); // Return filtered images
    });
};

// store product details
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
        productBeds,
        productBaths, 
        propertyArea,
        selectedAmenities
    } = req.body;

    if (!Array.isArray(selectedImages) || selectedImages.length === 0) {
        return res.status(400).json({ message: 'Selected images cannot be empty.' });
    }

    const featureImage = selectedImages[0];
    const imagesJson = JSON.stringify(selectedImages);

    try {
        const { store_id } = req.user;
        const amenitiesJson = selectedAmenities ? JSON.stringify(selectedAmenities) : null;

        // Fetch vendor details
        const userQuery = `
            SELECT brand_type, store_name, store_phone, email, image 
            FROM vendors 
            WHERE store_id = ?`;
        const userResult = await executeQuery(userQuery, [store_id]);

        if (userResult.length === 0) {
            return res.status(404).json({ message: 'Vendor not found.' });
        }

        const { brand_type: brandType, store_name, store_phone, email, image } = userResult[0];

        // Create a vendor details JSON
        const vendorDetails = JSON.stringify({
            store_name,
            store_phone,
            email,
            store_id,
            image,
        });

        // Generate a slug
        let slug = slugify(productName, { lower: true, strict: true });

        // Check if slug already exists
        const slugQuery = `SELECT COUNT(*) AS count FROM products WHERE slug = ?`;
        let slugExists = await executeQuery(slugQuery, [slug]);

        // Append a unique suffix if slug already exists
        if (slugExists[0].count > 0) {
            const uniqueSuffix = Date.now();
            slug = `${slug}-${uniqueSuffix}`;
        }

        // Real estate-specific logic to store bed, bath, sqft as JSON if brand_type is "Real Estate"
        let realEstateDetails = null;
        if (brandType === 'Real Estate') {
            if (productBeds != null && productBaths != null && propertyArea != null) {
                realEstateDetails = JSON.stringify({ productBeds, productBaths, propertyArea });
            } else {
                return res.status(400).json({ message: 'Real Estate details (bed, bath, sqft) must be provided.' });
            }
        }

        // Insert product data into database
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
                storeId,
                slug,
                numberOfReviews,
                vendorDetails,
                realEstateDetails, 
                amenities
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;


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
            slug,
            0, // Initialize numberOfReviews to 0
            vendorDetails,
            realEstateDetails,
            amenitiesJson
        ]);

        res.status(201).json({
            message: 'Product created successfully!',
            productId: result.insertId,
            slug,
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ message: 'Failed to create product.' });
    }
};

// Fetch all products
export const getProducts = (req, res) => {
    const sql = 'SELECT * FROM products';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ message: 'Failed to fetch products.' });
        }
        res.status(200).json(results);
    });
};

// Get Product By ID
export const getProductBySlug = async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM products WHERE slug = ?', [slug], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });

    if (result.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(result[0]); // Return the first product
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

// Update Product
export const updateProduct = async (req, res) => {
  const { slug } = req.params;
  const { 
    productName, 
    productPrice, 
    discountedPrice, 
    productDescription, 
    selectedCategory, 
    selectedImages 
  } = req.body;

  if (!slug) {
    return res.status(400).json({ message: 'Slug is required.' });
  }

  // Check if the product exists
  try {
    const rows = await dbQuery('SELECT * FROM products WHERE slug = ?', [slug]);
    const productExists = rows.length > 0 ? rows[0] : null; // Get the first row or null

    if (!productExists) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Update the product
    const sql = `
      UPDATE products 
      SET 
        productName = ?, 
        productPrice = ?, 
        discountedPrice = ?, 
        productDescription = ?, 
        selectedCategory = ?, 
        selectedImages = ? 
      WHERE slug = ?`;

    const values = [
      productName, 
      productPrice, 
      discountedPrice || null, 
      productDescription, 
      selectedCategory, 
      JSON.stringify(selectedImages), 
      slug,
    ];

    await dbQuery(sql, values);

    res.status(200).json({ message: 'Product updated successfully!' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Failed to update product.' });
  }
};

// Delete Product 
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully!' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

// Fetch Vendor products
export const fetchVendorProducts = async (req, res) => {
    try {
        const isAdmin = req.query.isAdmin;
        const { store_id } = req.user; 
        let sql = ``;
        if(isAdmin == 1){
            sql = `SELECT * FROM products`;
        } else {
            sql = `SELECT * FROM products WHERE storeId = ?`;
        }
        const products = await executeQuery(sql, [store_id]);

        res.status(200).json(products);
    } catch (err) {
        console.error('Error fetching vendor products:', err);
        res.status(500).json({ message: 'Failed to fetch vendor products.' });
    }
};

// Fetch Vendor Detail
export const fetchVendorDetails = async (req, res) => {
    try {
        const { store_id } = req.user;  // Extract the store_id from the authenticated user's info
        
        // Fetch vendor details based on store_id
        const sql = `
            SELECT brand_type, store_name, store_phone, email, image, isAdmin
            FROM vendors 
            WHERE store_id = ?
        `;
        const vendorResult = await executeQuery(sql, [store_id]);

        // If the vendor does not exist
        if (vendorResult.length === 0) {
            return res.status(404).json({ message: 'Vendor not found.' });
        }

        // Extract vendor details
        const { brand_type: brandType, store_name, store_phone, email, image, isAdmin } = vendorResult[0];

        // Send the vendor details as a response
        return res.status(200).json({
            store_name,
            store_phone,
            email,
            image,
            brand_type: brandType,
            isAdmin,
        });

    } catch (error) {
        console.error('Error fetching vendor details:', error);
        return res.status(500).json({ message: 'Failed to fetch vendor details' });
    }
};

export const fetchAllVendors = async (req, res) => {
    try {
        const isAdmin = req.query.isAdmin;
        let sql;
        if(isAdmin == 1){
            sql = `SELECT address1, address2, brand_type, city, country, email, first_name, image, isAdmin, last_name, postcode, state_county, store_id, store_name, store_phone, vendor_status
            FROM vendors`;
        } 
        const vendors = await executeQuery(sql);

        // Respond with the fetched vendors
        res.status(200).json(vendors);
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ message: 'Failed to fetch vendors.' });
    }
};

// Controller to update vendor access status
export const updateVendorAccess = async (req, res) => {
    const {vendorId, newStatus} = req.body;

    if (!vendorId || newStatus === undefined) {
        return res.status(400).json({ message: 'store_id and newStatus are required' });
    }
    try {
        const query = 'UPDATE vendors SET vendor_status = ? WHERE store_id = ?';
        await db.query(query, [newStatus, vendorId]);
        res.status(200).json({ message: 'Vendor access status updated successfully' });
    } catch (error) {
        console.error('Error updating vendor access status:', error);
        res.status(500).json({ message: 'Failed to update vendor access status' });
    }
};

const generateOrderId = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomLetters = letters.charAt(Math.floor(Math.random() * letters.length)) +
                        letters.charAt(Math.floor(Math.random() * letters.length));
  const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit number
  return `${randomLetters}${randomNumbers}`;
};

export const checkoutOrder = async (req, res) => {
  const { error } = orderValidationSchema.validate(req.body, { abortEarly: false });
  if (error) {
      const errorMessages = error.details.map((err) => err.message);
      return res.status(400).json({ message: errorMessages });
  }

  const { clientDetails, cartItems, totalCost } = req.body;

  try {
      // Validate product slugs and fetch corresponding vendor details
      const slugs = cartItems.map((item) => item.slug);
      const slugQuery = `
          SELECT slug, productName, store_id, store_name 
          FROM products p
          JOIN vendors v ON store_id = store_id
          WHERE slug IN (?)
      `;
      const productRows = await executeQuery(slugQuery, [slugs]);

      const existingSlugs = new Map(
          productRows.map((row) => [
              row.slug,
              { productName: row.productName, store_id: row.store_id, store_name: row.store_name },
          ])
      );

      const missingProducts = cartItems.filter((item) => !existingSlugs.has(item.slug));
      if (missingProducts.length > 0) {
          const missingNames = missingProducts.map((item) => item.productName).join(", ");
          return res.status(400).json({ message: `The following products are not available: ${missingNames}` });
      }

      const vendorDetails = [];
      for (const item of cartItems) {
          const productData = existingSlugs.get(item.slug);
          vendorDetails.push({
              store_id: productData.store_id,
              store_name: productData.store_name,
              productName: productData.productName,
          });
      }
      // Generate a unique order ID
      const orderId = generateOrderId();
      // Save the order in the database
      const orderQuery = `
          INSERT INTO orders (order_id, client_details, cart_items, total_cost, vendor_details, order_date)
          VALUES (?, ?, ?, ?, ?, NOW())
      `;
      const orderResult = await executeQuery(orderQuery, [
          orderId,
          JSON.stringify(clientDetails),
          JSON.stringify(cartItems),
          totalCost,
          JSON.stringify(vendorDetails),
      ]);

      res.status(201).json({ message: "Order placed successfully!", orderId });
  } catch (error) {
      console.error("Error saving order:", error);
      res.status(500).json({ message: "Failed to place order" });
  }
};

export const getOrdersByVendor = async (req, res) => {
    const isAdmin = req.query.isAdmin;
  const { store_id } = req.user; 
  try {
    let query;
    if(isAdmin == 1){
        query = `
            SELECT order_id, client_details, cart_items, total_cost, order_date, vendor_details
            FROM orders
            ORDER BY order_date DESC
        `;
    } else{
        query = `
            SELECT order_id, client_details, cart_items, total_cost, order_date, vendor_details
            FROM orders
            WHERE JSON_CONTAINS(vendor_details, JSON_OBJECT('store_id', ?))
            ORDER BY order_date DESC
        `;
    }

      const orders = await executeQuery(query, [store_id]);
      if (orders.length === 0) {
          return res.status(404).json({ message: "No orders found for this vendor" });
      }

      res.status(200).json(orders);
  } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
  }
};

