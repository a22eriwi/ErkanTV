// index.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const StreamLog = require('./models/streamLog');
const User = require('./models/User');
const moviesMetadata = require('./moviesMetadata.json');
const recentlyAdded = require('./recentlyAdded.json');
const seriesMetadata = require('./seriesMetadata.json');
const seriesTitles = require('./seriesTitles.json');
const WatchProgress = require('./models/watchProgress');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const PORT = process.env.PORT || 5000;

if (!JWT_SECRET || !REFRESH_SECRET) {
  console.error('JWT_SECRET or REFRESH_SECRET is not defined!');
  process.exit(1);
}

//Movie and series folder link to env file
const MOVIES_FOLDER = process.env.MOVIES_FOLDER;
const SERIES_FOLDER = process.env.SERIES_FOLDER;

const app = express();

app.use('/media', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Serve video files from media folders
app.use('/media/Movies', express.static(MOVIES_FOLDER));
app.use('/media/Series', express.static(SERIES_FOLDER));

app.use('/moviePosters', express.static(path.join(__dirname, 'moviePosters')));
app.use('/seriesPosters', express.static(path.join(__dirname, 'seriesPosters')));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());                          // automatically parse incoming JSON in requests
const cookieParser = require('cookie-parser');    //HttpOnly cookie
app.use(cookieParser());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));


app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body; //extract all first
  console.log("Registering user:", name, email);

  try {
    // Check if email or name already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { name }]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or name already in use' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create and save new user
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//Refresh token
app.post('/api/token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(payload.id);

    if (!user || user.refreshToken !== refreshToken) return res.sendStatus(403);

    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.sendStatus(403);
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No user found with this email' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid password' });

    if (!user.approved) {
      return res.status(403).json({ message: 'Your account is not yet approved.' });
    }

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    //Create access token, lasts 7 days
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

    user.refreshToken = refreshToken;
    await user.save();

    // Set HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ accessToken }); // Send accessToken only
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//Logout route
app.post('/api/logout', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax', // must match login
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Middleware to protect all sensitive routes
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Middleware to ensure admin-only access
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' });
    }
    next();
  });
}

// Protect admin-only routes
app.get('/api/admin/all-users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get all users that are NOT approved
app.get('/api/admin/pending-users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ approved: false }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pending users' });
  }
});

// Approve a user by ID
app.post('/api/admin/approve/:id', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { approved: true });
    res.json({ message: 'User approved' });
  } catch (err) {
    res.status(500).json({ message: 'Error approving user' });
  }
});

// Delete (disapprove) a user by ID
app.delete('/api/admin/delete/:id', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

app.get('/api/admin/stream-logs', requireAdmin, async (req, res) => {
  try {
    const logs = await StreamLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error('❌ Error fetching stream logs:', err);
    res.status(500).json({ message: 'Error fetching stream logs' });
  }
});

//Create a wish post
const Wish = require('./models/Wish');

app.post('/api/wishes', requireAuth, async (req, res) => {

  try {

    const { title, message } = req.body;
    const { name, email } = req.user;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const newWish = new Wish({
      title,
      message,
      userName: name,
      userEmail: email,
    });

    await newWish.save();
    res.status(201).json({ message: 'Wish saved successfully', userName: name });
  } catch (err) {
    console.error('Wish save error:', err);
    res.status(403).json({ message: 'Invalid token' });
  }
});

//Retrieve wishes 
app.get('/api/wishes', requireAuth, async (req, res) => {
  try {
    const wishes = await Wish.find().sort({ createdAt: -1 });
    res.json(wishes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching wishes' });
  }
});

// Delete wish
app.delete('/api/wishes/delete/:id', requireAuth, async (req, res) => {

  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish) return res.status(404).json({ message: 'Wish not found' });

    // Check if the wish belongs to the logged-in user or if admin
    if (wish.userEmail !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own wishes' });
    }

    await Wish.findByIdAndDelete(req.params.id);
    res.json({ message: 'Wish deleted successfully' });
  } catch (err) {
    console.error('Delete wish error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//Import movies from folder
app.get('/api/movies', requireAuth, (req, res) => {
  try {
    const movies = Object.entries(moviesMetadata).map(([title, meta]) => ({
      title,
      folder: meta.folder,
      filename: meta.filename
    }));

    res.json(movies);
  } catch (err) {
    console.error('Failed to load movie metadata:', err);
    res.status(500).json({ message: 'Could not load movie list' });
  }
});

//Movie streaming route
app.get('/api/stream/movie/:folder/:filename', requireAuth, async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const safeFolder = path.basename(req.params.folder);
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(MOVIES_FOLDER, safeFolder, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const displayTitle = safeFolder;

    // If no range header – serve first 1MB chunk
    if (!range) {
      const chunkSize = 1 * 1024 * 1024; // 1MB
      const file = fs.createReadStream(filePath, { start: 0, end: chunkSize - 1 });

      res.writeHead(206, {
        'Content-Range': `bytes 0-${chunkSize - 1}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache',
      });

      return file.pipe(res);
    }

    // Parse Range
    const parts = range.replace(/bytes=/, '').split('-');
    const start = Math.min(parseInt(parts[0], 10), fileSize - 1);
    const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    // Log stream if starting at 0
    if (start === 0) {
      const recentLog = await StreamLog.findOne({
        userEmail: req.user.email,
        fileName: displayTitle,
        createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
      });

      if (!recentLog) {
        await StreamLog.create({
          userEmail: req.user.email,
          userName: req.user.name,
          fileName: displayTitle,
          seriesName: null,
          type: 'movie',
        });
      }
    }

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    });

    file.pipe(res);
  } catch (err) {
    console.error('Stream error (movie):', err);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
});

// Series streaming route
app.get('/api/stream/file', requireAuth, async (req, res) => {
  try {
    const encodedPath = req.query.path;
    if (!encodedPath) return res.status(400).json({ message: 'Missing path' });

    const decodedPath = decodeURIComponent(encodedPath);
    const safePath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(SERIES_FOLDER, safePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }


    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Extract filename and series name
    const fileName = path.basename(filePath); // e.g. "S01E01.mkv"
    const displayTitle = path.basename(path.dirname(path.dirname(filePath))); // e.g. "Game of Thrones"

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      // 🔹 Log only when playback starts (first chunk)
      if (start === 0) {
        const recentLog = await StreamLog.findOne({
          userEmail: req.user.email,
          fileName,
          createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
        });

        if (!recentLog) {
          await StreamLog.create({
            userEmail: req.user.email,
            userName: req.user.name,
            fileName,
            seriesName: displayTitle,
            type: 'series',
          });
        }
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });

      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Streaming error:', err);
    res.status(500).json({ message: 'Streaming failed' });
  }
});

// Save or update watch progress
app.post('/api/progress', requireAuth, async (req, res) => {
  const { fileName, time, duration, type, fullPath } = req.body;

  if (!fileName || time == null) return res.status(400).json({ message: 'Missing data' });

  try {
    await WatchProgress.findOneAndUpdate(
      { userEmail: req.user.email, fileName },
      {
        time,
        duration,
        type,
        ...(fullPath && { fullPath })
      },
      { upsert: true, new: true }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Failed to save progress:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//Retrieve the watch progress
app.get('/api/progress', requireAuth, async (req, res) => {
  const { fileName } = req.query;
  const progress = await WatchProgress.findOne({
    userEmail: req.user.email,
    fileName,
  });
  res.json(progress || {});
});

//Fetch progress for the last viewed episode in a series
app.get('/api/progress/last-series-episode', requireAuth, async (req, res) => {
  const { seriesName } = req.query;
  if (!seriesName) return res.status(400).json({ message: 'Missing seriesName' });

  try {
    const progress = await WatchProgress.findOne({
      userEmail: req.user.email,
      type: 'series',
      fullPath: { $regex: new RegExp(`^${seriesName}/`, 'i') } // Match beginning of fullPath
    }).sort({ updatedAt: -1 });

    if (!progress) return res.status(404).json({ message: 'No progress found' });

    res.json(progress);
  } catch (err) {
    console.error('❌ Failed to fetch last watched series episode:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch all progress entries for a specific series
app.get('/api/progress/all-for-series', requireAuth, async (req, res) => {
  const { seriesName } = req.query;
  if (!seriesName) {
    return res.status(400).json({ message: 'Missing seriesName' });
  }

  try {
    const progress = await WatchProgress.find({
      userEmail: req.user.email,
      type: 'series',
      fullPath: { $regex: new RegExp(`^${seriesName}/`, 'i') }
    });

    res.json(progress);
  } catch (err) {
    console.error('Failed to fetch all progress for series:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//Import all the series folders
app.get('/api/series', requireAuth, (req, res) => {
  try {
    const folders = fs
      .readdirSync(SERIES_FOLDER, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    res.json(folders);
  } catch (err) {
    console.error('Failed to list series folders:', err);
    res.status(500).json({ message: 'Could not list series folders' });
  }
});

//Import seasons from folder
app.get('/api/series/:seriesName', requireAuth, (req, res) => {
  try {
    const seriesName = req.params.seriesName;
    const seriesPath = path.join(SERIES_FOLDER, seriesName);

    if (!fs.existsSync(seriesPath)) {
      return res.status(404).json({ message: 'Series not found' });
    }

    let seasonDirs = fs.readdirSync(seriesPath, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    //Sort seasons numerically by season number
    seasonDirs.sort((a, b) => {
      const getNumber = (dirName) => parseInt(dirName.replace(/\D/g, ''), 10);
      return getNumber(a.name) - getNumber(b.name);
    });

    const seasons = seasonDirs.map((seasonDir) => {
      const seasonPath = path.join(seriesPath, seasonDir.name);

      const episodes = fs.readdirSync(seasonPath)
        .filter((f) => /\.(mp4|mkv|avi)$/i.test(f))
        .map((file) => {
          const title = path.parse(file).name;
          return {
            title,
            path: `${seriesName}/${seasonDir.name}/${file}`,
          };
        });

      return {
        season: seasonDir.name,
        episodes,
      };
    });

    res.json({ series: seriesName, seasons });
  } catch (err) {
    console.error('Failed to load series:', err);
    return res.status(500).json({ message: 'Could not load series' });
  }
});

// Retrieve Metadata for movies
app.get('/api/metadata/:title', (req, res) => {
  const rawTitle = decodeURIComponent(req.params.title).trim();
  const metadata = moviesMetadata[rawTitle];

  if (!metadata) {
    return res.status(404).json({ message: 'Metadata not found for movie', title: rawTitle });
  }

  res.json(metadata);
});

//Retrieve metadata for series
app.get('/api/series-metadata/:folder', requireAuth, async (req, res) => {
  const folder = req.params.folder;

  const metadata = seriesMetadata[folder];

  if (!metadata) {
    return res.status(404).json({ message: 'Metadata not found for series', folder });
  }

  res.json(metadata);
});

//Fetches movies metadata by folder
app.get('/api/movie-metadata/:folder', requireAuth, (req, res) => {
  const requestedFolder = decodeURIComponent(req.params.folder).trim().toLowerCase();

  const match = Object.entries(moviesMetadata).find(([_, meta]) =>
    meta.folder.trim().toLowerCase() === requestedFolder
  );

  if (!match) {
    console.warn('Metadata not found. Requested:', requestedFolder);
    return res.status(404).json({ message: 'Metadata not found for movie', folder: requestedFolder });
  }

  const [title, data] = match;
  res.json({ ...data, Title: title });
});

// Return all movie metadata (for suggestions)
app.get('/api/movie-metadata', requireAuth, (req, res) => {
  const result = Object.entries(moviesMetadata).reduce((acc, [title, data]) => {
    acc[data.folder] = { ...data, Title: title };
    return acc;
  }, {});

  res.json(result);
});

//Retrieve metadata for series (for suggestions)
app.get('/api/series-metadata', requireAuth, (req, res) => {
  res.json(seriesMetadata);
});

//Filter most watched series from streamLog
app.get('/api/top-series', requireAuth, async (req, res) => {
  try {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await StreamLog.aggregate([
      {
        $match: {
          createdAt: { $gte: oneMonthAgo },
          type: 'series'
        }
      },
      { $group: { _id: '$seriesName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    const topSeriesNames = logs.map(log => log._id);
    res.json(topSeriesNames);
  } catch (err) {
    console.error('Error fetching top series:', err);
    res.status(500).json({ message: 'Server error fetching top series' });
  }
});

//Filter most watched movies from streamLog
app.get('/api/top-picks', requireAuth, async (req, res) => {
  try {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await StreamLog.aggregate([
      {
        $match: {
          createdAt: { $gte: oneMonthAgo },
          type: 'movie'
        }
      },
      { $group: { _id: '$fileName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    const picks = logs.map(log => {
      const metadataEntry = Object.entries(moviesMetadata).find(
        ([title, meta]) => title === log._id || meta.folder === log._id
      );
      if (!metadataEntry) return null;

      const [title, meta] = metadataEntry;
      return { folder: meta.folder, filename: meta.filename, title };
    }).filter(Boolean);

    res.json(picks);
  } catch (err) {
    console.error('Error fetching top picks:', err);
    res.status(500).json({ message: 'Server error fetching top picks' });
  }
});

//Recently added
app.get('/api/recent-content', requireAuth, (req, res) => {
  try {
    const movieEntries = recentlyAdded.movies
      .map((title) => {
        const match = Object.entries(moviesMetadata).find(
          ([folderName]) => folderName.toLowerCase() === title.toLowerCase()
        );
        if (!match) return null;
        const [folder, meta] = match;
        return {
          type: 'movie',
          fileName: meta.filename,
          title: folder,
          folder
        };
      })
      .filter(Boolean);

    const seriesEntries = recentlyAdded.series.map(({ seriesName }) => ({
      type: 'series',
      seriesName,
      title: seriesName,
      folder: seriesName,
    }));

    res.json([...movieEntries, ...seriesEntries]);
  } catch (err) {
    console.error('/api/recent-content failed:', err);
    res.status(500).json({ message: 'Error reading recent content' });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`));