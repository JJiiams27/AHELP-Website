const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create an Express application
const app = express();

// Middleware to parse JSON and enable CORS
app.use(cors());
app.use(bodyParser.json());

// Directory to store persistent data (relative to this file)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper file paths
const usersFile = path.join(DATA_DIR, 'users.json');
const communityFile = path.join(DATA_DIR, 'community.json');
const progressFile = path.join(DATA_DIR, 'progress.json');

// Helper functions to read and write JSON safely
function readJson(file) {
    try {
        if (!fs.existsSync(file)) return [];
        const data = fs.readFileSync(file, 'utf-8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error(`Error reading ${file}:`, err);
        return [];
    }
}

function writeJson(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error writing ${file}:`, err);
    }
}

// ---------- User Endpoints ----------

// Register a new user
app.post('/api/register', (req, res) => {
    const {
        username,
        password,
        name,
        agency,
        age,
        gender,
        height,
        weight,
        exercise,
        fruitsVeg,
        water,
        tobacco
    } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    const users = readJson(usersFile);
    if (users.find((u) => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists.' });
    }
    // Create a salted password hash to avoid storing plain text
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
    const newUser = {
        username,
        passwordHash: hash,
        salt,
        name: name || '',
        agency: agency || '',
        age: age || '',
        gender: gender || '',
        height: height || '',
        weight: weight || '',
        exercise: exercise || '',
        fruitsVeg: fruitsVeg || '',
        water: water || '',
        tobacco: tobacco || '',
        points: 0
    };
    users.push(newUser);
    writeJson(usersFile, users);
    return res.json({ message: 'User registered successfully.' });
});

// Authenticate a user and return their profile (excluding sensitive fields)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJson(usersFile);
    const user = users.find((u) => u.username === username);
    if (!user) {
        return res.status(400).json({ error: 'Invalid credentials.' });
    }
    const hash = crypto.createHmac('sha256', user.salt).update(password).digest('hex');
    if (hash !== user.passwordHash) {
        return res.status(400).json({ error: 'Invalid credentials.' });
    }
    // Return a copy of the user object without password hash/salt
    const { passwordHash, salt, ...safeUser } = user;
    return res.json(safeUser);
});

// Get user profile (excluding sensitive fields)
app.get('/api/user/:username', (req, res) => {
    const users = readJson(usersFile);
    const user = users.find((u) => u.username === req.params.username);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    const { passwordHash, salt, ...safeUser } = user;
    return res.json(safeUser);
});

// Add points to a user
app.post('/api/user/:username/points', (req, res) => {
    const { points } = req.body;
    if (typeof points !== 'number') {
        return res.status(400).json({ error: 'The "points" field must be a number.' });
    }
    const users = readJson(usersFile);
    const user = users.find((u) => u.username === req.params.username);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    user.points = (user.points || 0) + points;
    writeJson(usersFile, users);
    return res.json({ points: user.points });
});

// ---------- Progress Endpoints ----------

// Log progress for a user
app.post('/api/user/:username/progress', (req, res) => {
    const { steps, minutes } = req.body;
    if (steps == null && minutes == null) {
        return res.status(400).json({ error: 'Please provide steps or minutes.' });
    }
    const progress = readJson(progressFile);
    progress.push({
        username: req.params.username,
        steps: steps || null,
        minutes: minutes || null,
        timestamp: new Date().toISOString()
    });
    writeJson(progressFile, progress);
    return res.json({ message: 'Progress logged successfully.' });
});

// Retrieve all progress entries for a user
app.get('/api/user/:username/progress', (req, res) => {
    const progress = readJson(progressFile).filter((p) => p.username === req.params.username);
    return res.json(progress);
});

// ---------- Community Endpoints ----------

// Retrieve all community posts
app.get('/api/community', (req, res) => {
    const posts = readJson(communityFile);
    return res.json(posts);
});

// Create a new community post
app.post('/api/community', (req, res) => {
    const { username, title, description, image, duration, activityType } = req.body;
    if (!username || !description) {
        return res.status(400).json({ error: 'Post must include a username and description.' });
    }
    const posts = readJson(communityFile);
    posts.push({
        username,
        title: title || '',
        description,
        image: image || '',
        duration: duration || '',
        activityType: activityType || '',
        timestamp: new Date().toISOString()
    });
    writeJson(communityFile, posts);
    return res.json({ message: 'Post created successfully.' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AHELP backend listening on port ${PORT}`);
});