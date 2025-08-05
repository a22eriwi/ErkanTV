require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const seriesTitles = require('./seriesTitles.json');
const outputDir = path.join(__dirname, 'seriesPosters');
const cachePath = path.join(__dirname, 'seriesMetadata.json');

if (!OMDB_API_KEY) {
  console.error(' OMDB_API_KEY is not set. Add it to .env');
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

let seriesMetadataCache = {};
if (fs.existsSync(cachePath)) {
  seriesMetadataCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
}

const folderToTitleMap = {}; // Step 1: Build this reverse map

// Build folder → clean title map based on how you group episodes
for (const [episode, folder] of Object.entries(seriesTitles)) {
  folderToTitleMap[folder] = folder; // assuming folder name is what you use in your app
}

const uniqueFolders = [...new Set(Object.values(seriesTitles))];

async function fetchSeriesMetadata() {
  for (const folder of uniqueFolders) {
    const cleanName = folder.trim(); // This is used for OMDb search and poster naming
    const posterFilename = `${folder}.jpg`;

    if (seriesMetadataCache[folder]) {
      console.log(` Cached metadata for: ${folder}`);
      continue;
    }

    console.log(` Fetching metadata for: ${cleanName}`);
    try {
      const res = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(cleanName)}&type=series&apikey=${OMDB_API_KEY}`);
      const data = res.data;

      if (data.Response === 'False') {
        console.warn(` No metadata found for: ${cleanName}`);
        continue;
      }

      // Inject folder name into metadata
      const metadataWithFolder = {
        ...data,
        folder: folder
      };

      seriesMetadataCache[folder] = metadataWithFolder;

      if (data.Poster && data.Poster !== 'N/A') {
        const posterPath = path.join(outputDir, posterFilename);
        if (!fs.existsSync(posterPath)) {
          console.log(`⬇ Downloading poster for: ${folder}`);
          await downloadImage(data.Poster, posterFilename);
        } else {
          console.log(` Poster already exists: ${posterFilename}`);
        }
      } else {
        console.warn(` No poster for: ${folder}`);
      }

    } catch (err) {
      console.error(` Failed to fetch ${cleanName}:`, err.message);
    }
  }

  fs.writeFileSync(cachePath, JSON.stringify(seriesMetadataCache, null, 2));
  console.log(` Series metadata written to ${cachePath}`);
}

async function downloadImage(url, filename) {
  const response = await axios.get(url, { responseType: 'stream' });
  const posterPath = path.join(outputDir, filename);
  const writer = fs.createWriteStream(posterPath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}


fetchSeriesMetadata();