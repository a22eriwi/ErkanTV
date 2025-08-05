const fs = require('fs');
const path = require('path');

const SERIES_FOLDER = 'D:/ErkanTV/Movies&Series/Series';
const seriesTitles = {};

const seriesFolders = fs.readdirSync(SERIES_FOLDER);

for (const seriesFolder of seriesFolders) {
  const seriesPath = path.join(SERIES_FOLDER, seriesFolder);

  if (fs.statSync(seriesPath).isDirectory()) {
    const seasonFolders = fs.readdirSync(seriesPath, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const seasonFolder of seasonFolders) {
      const seasonPath = path.join(seriesPath, seasonFolder.name);

      const episodes = fs.readdirSync(seasonPath)
        .filter((f) => /\.(mp4|mkv|avi)$/i.test(f));

      for (const file of episodes) {
        const nameWithoutExt = file.replace(/\.[^/.]+$/, '');
        seriesTitles[nameWithoutExt] = seriesFolder;
      }
    }
  }
}

fs.writeFileSync('./seriesTitles.json', JSON.stringify(seriesTitles, null, 2));
console.log(' seriesTitles.json created!');
