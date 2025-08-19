const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const db = require('./db'); 
const app = express();
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';


const adminRoutes = require('./routes/admin')(db, JWT_SECRET);
app.use('/admin', adminRoutes);

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

