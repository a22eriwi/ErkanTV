require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const MOVIES_FOLDER = 'D:/ErkanTV/Movies&Series/Movies'; // each subfolder is a movie
const outputJson = 'moviesMetadata.json';
const posterDir = 'moviePosters';

if (!OMDB_API_KEY) {
  console.error(' OMDB_API_KEY is not set in your .env file');
  process.exit(1);
}

if (!fs.existsSync(posterDir)) {
  fs.mkdirSync(posterDir);
}

let metadataCache = {};
if (fs.existsSync(outputJson)) {
  metadataCache = JSON.parse(fs.readFileSync(outputJson, 'utf-8'));
}

// Helper: find the first .mp4 or .mkv file in a folder
function findVideoFile(folderPath) {
  const files = fs.readdirSync(folderPath);
  return files.find(f => /\.(mp4|mkv)$/i.test(f));
}

// Download poster if needed
async function downloadPoster(url, title) {
  const posterPath = path.join(posterDir, `${title}.jpg`);
  if (fs.existsSync(posterPath)) return;

  const response = await axios.get(url, { responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(posterPath);
    response.data.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function processMovies() {
  const folders = fs.readdirSync(MOVIES_FOLDER, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(dir => dir.name);

  for (const folderName of folders) {
    const folderPath = path.join(MOVIES_FOLDER, folderName);
    const videoFile = findVideoFile(folderPath);
    if (!videoFile) {
      console.warn(` No video file found in: ${folderName}`);
      continue;
    }

    const displayTitle = folderName;

    if (metadataCache[displayTitle]) {
      console.log(` Cached: ${displayTitle}`);
      continue;
    }

    console.log(` Fetching metadata for: ${displayTitle}`);
    try {
      const res = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(displayTitle)}&apikey=${OMDB_API_KEY}`);
      const data = res.data;

      if (data.Response === 'False') {
        console.warn(` No metadata for: ${displayTitle}`);
        continue;
      }

      metadataCache[displayTitle] = {
        ...data,
        folder: folderName,
        filename: videoFile
      };

      if (data.Poster && data.Poster !== 'N/A') {
        await downloadPoster(data.Poster, displayTitle);
      } else {
        console.warn(` No poster for: ${displayTitle}`);
      }

    } catch (err) {
      console.error(` Failed to fetch ${displayTitle}: ${err.message}`);
    }
  }

  fs.writeFileSync(outputJson, JSON.stringify(metadataCache, null, 2));
  console.log(` Metadata saved to ${outputJson}`);
}

processMovies();
