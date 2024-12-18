import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './src/routes/routes.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

app.use('/', routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
