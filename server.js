require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const cors = require('cors');
const cron = require('node-cron');
const app = express();
const multer = require('multer');
const port = process.env.PORT || 3000;
const cleanupExpiredTokens = () => {
    const query = 'DELETE FROM tokens WHERE expires_at < NOW()';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error cleaning up expired tokens:', err);
        } else {
            console.log(`Removed ${results.affectedRows} expired tokens.`);
        }
    });
};


const upload = multer({ dest: 'uploads/' }); // Directory for storing uploaded files

// Schedule the cleanup job to run every 30 minutes
cron.schedule('*/30 * * * *', () => {
    console.log('Running token cleanup...');
    cleanupExpiredTokens();
});

// JWT authentication middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user; // Attach user info to request
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Middleware to check if token is blacklisted
function isTokenBlacklisted(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        connection.query('SELECT * FROM tokens WHERE token = ? AND blacklisted = TRUE', [token], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Error checking token status' });
            }
            if (results.length > 0) {
                return res.status(401).json({ message: 'Token is blacklisted.' });
            }
            next();
        });
    } else {
        return res.status(401).json({ message: 'No token provided' });
    }
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());
app.use(cors());


// Create a connection to the MySQL server
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Promisify query for easier usage with async/await
const query = promisify(connection.query).bind(connection);

// Connect to the MySQL server
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL server:', err);
        return;
    }
    console.log('Connected to MySQL server.');

    // Check if the database exists
    const dbName = process.env.DB_NAME;
    connection.query(`SHOW DATABASES LIKE '${dbName}'`, (err, results) => {
        if (err) {
            console.error('Error checking database existence:', err);
            connection.end();
            return;
        }

        if (results.length === 0) {
            // Database does not exist, create it
            connection.query(`CREATE DATABASE ${dbName}`, err => {
                if (err) {
                    console.error('Error creating database:', err);
                } else {
                    console.log('Database created successfully.');
                }
                // After creating the database, connect to it and create tables
                setupDatabase();
            });
        } else {
            console.log('Database already exists.');
            // Connect to the existing database and create tables
            setupDatabase();
        }
    });
});

// Function to setup the database and create tables
async function setupDatabase() {
    return new Promise((resolve, reject) => {
        // Update the connection with the specific database
        connection.changeUser({ database: process.env.DB_NAME }, async (err) => {
            if (err) {
                console.error('Error selecting database:', err);
                return reject(err);
            }
            console.log('Connected to MySQL database.');

            try {
                // Create tables if they don't exist
                await createTables();
                console.log('All tables created successfully!');
                resolve(); // Resolve the promise when done
            } catch (error) {
                console.error('Error creating tables:', error);
                reject(error); // Reject the promise if there's an error
            }
        });
    });
}

// Function to create all necessary tables
async function createTables() {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createEnquiriesTable = `
        CREATE TABLE IF NOT EXISTS enquiries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createPersonalDetailsTable = `
    CREATE TABLE IF NOT EXISTS Personal_Details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        address TEXT NOT NULL,
        cv VARCHAR(512) NOT NULL,
        user_id INT NOT NULL, -- Add user_id for foreign key reference
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`;


    const createTokensTable = `
        CREATE TABLE IF NOT EXISTS tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            blacklisted BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;

    // Execute all table creation queries
    await query(createUsersTable);
    await query(createEnquiriesTable);
    await query(createPersonalDetailsTable);
    await query(createTokensTable);
}

// setupDatabase function and handle errors
setupDatabase().catch(error => {
    console.error('Error setting up database:', error);
});
// Routes
// Serve HTML files for specific routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


// personalDetails Route
app.post('/personalDetails', [authenticateJWT, isTokenBlacklisted, upload.single('cv')], (req, res) => {
    const { name, email, phone_number, address } = req.body;
    const userId = req.user.id; // Get user ID from token
    const cv = req.file ? req.file.path : null; // Get the uploaded CV file path

    // Add basic validation (optional)
    if (!name || !email || !phone_number || !address || !cv) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const query = 'INSERT INTO personal_details (user_id, name, email, phone_number, address, cv) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(query, [userId, name, email, phone_number, address, cv], function (err, result) {
        if (err) {
            console.error('Error saving personal details:', err);
            return res.status(500).json({ message: 'Error saving personal details' });
        }
        res.json({ message: 'Personal data updated successfully' });
    });
});


// Route to handle enquiries
app.post('/enquiries', (req, res) => {
    const { email, message } = req.body; // Destructure email and message from the request body

    if (!email || !message) {
        return res.status(400).json({ error: 'Email and message are required.' });
    }

    const insertEnquiryQuery = 'INSERT INTO enquiries (email, message) VALUES (?, ?)';
    connection.query(insertEnquiryQuery, [email, message], (err, result) => {
        if (err) {
            console.error('Error saving enquiry to database:', err);
            return res.status(500).json({ success: false, message: 'Failed to save enquiry' });
        }
        console.log('Enquiry saved to database');
        return res.status(200).json({ success: true, message: 'Enquiry received and saved successfully.' });
    });
});



// Register Route
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const checkQuery = 'SELECT * FROM users WHERE email = ?';
        const existingUser = await query(checkQuery, [email]);

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        await query(insertQuery, [username, email, hashedPassword]);

        res.status(201).json({ message: 'Registration successful.' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Registration failed. Please try again later.' });
    }
});


// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const results = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '25m' });
        const expiresAt = new Date(Date.now() + 25 * 60 * 1000);
        await query('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

        res.json({ success: true, token, username: user.username, email: user.email });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ success: false, message: 'Error logging in' });
    }


    // Cleanup expired tokens after a successful login
    cleanupExpiredTokens();
});

// Logout Route
app.post('/logout', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from header

    if (!token) {
        return res.status(403).json({ success: false, message: 'Forbidden: No token provided' });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
        }

        try {
            // Proceed to delete the token from the database
            const query = 'DELETE FROM tokens WHERE token = ?';
            await query(query, [token]);

            // Optional: Clean up expired tokens
            await cleanupExpiredTokens();

            res.json({ success: true, message: 'Successfully logged out' });
        } catch (error) {
            console.error('Error during logout:', error);
            res.status(500).json({ success: false, message: 'Error logging out' });
        }
    });
});


// Cleanup expired tokens after a logout
cleanupExpiredTokens();

// Endpoint to Check Token
app.get('/check-token', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        console.log('Token not found in request headers');
        return res.status(403).json({ valid: false, message: 'No token provided' });
    }

    try {
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    console.log('Invalid or expired token:', err);
                    return reject(new Error('Invalid or expired token'));
                }
                resolve(decoded);
            });
        });

        // Check if the token exists in the database
        const query = 'SELECT * FROM tokens WHERE token = ?';
        const [results] = await queryDatabase(query, [token]); // Assuming queryDatabase is a promisified version of your query function

        if (results.length === 0) {
            console.log('Token not found in database');
            return res.status(403).json({ valid: false, message: 'Token not found in database' });
        }

        // Return success and user info if token is valid
        console.log('Token is valid:', decoded);
        res.json({ valid: true, username: decoded.username || decoded.email });
    } catch (err) {
        console.error('Error in token check:', err);
        return res.status(500).json({ valid: false, message: 'Server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    cleanupExpiredTokens();
});


// Graceful shutdown handling
process.on('SIGINT', () => {
    connection.end(() => {
        console.log('Database connection closed');
        process.exit(0);
    });
});