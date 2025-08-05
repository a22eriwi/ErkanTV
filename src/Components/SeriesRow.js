// src/components/SeriesRow.js
import { useAuth } from '../authContext';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import api from '../Api'; // use configured Axios instance


export default function RenderSeriesRow() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return null;
  return (
    <>
      {isLoggedIn && <SeriesRow title="Most Watched Series" topSeries={true} />}
    </>
  );
}

function SeriesRow({ title, topSeries = false }) {
  const [seriesList, setSeriesList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const route = topSeries ? '/api/top-series' : '/api/series';
        const res = await api.get(route);
        const folderNames = res.data;

        const seriesWithMetadata = await Promise.all(
          folderNames.map(async (folder) => {
            try {
              const metaRes = await api.get(`/api/series-metadata/${encodeURIComponent(folder)}`);
              const metaData = metaRes.data;

              return {
                folder,
                title: metaData.Title || folder,
                poster: `${api.defaults.baseURL}/seriesPosters/${encodeURIComponent(folder)}.jpg`,
                imdbRating: metaData.imdbRating || 'N/A',
                genre: metaData.Genre || '',
              };
            } catch (err) {
              console.warn(`Metadata fetch failed for "${folder}"`, err);
              return {
                folder,
                title: folder,
                poster: null,
                imdbRating: 'N/A',
                genre: '',
              };
            }
          })
        );

        setSeriesList(seriesWithMetadata);
      } catch (err) {
        console.error('Error fetching series folders or metadata:', err);
      }
    };

    fetchSeries();
  }, [topSeries]);

  const handleSeriesClick = (folderName) => {
    navigate(`/series/${encodeURIComponent(folderName)}`);
  };

  return (
    <div className="centreraCards">
      <div className='homeComponent'>
        <h3>{title}</h3>
        <div className="cards" id='homeCards'>
          {seriesList.map((series) => (
            <div
              key={series.folder}
              className="movie-card"
              onClick={() => handleSeriesClick(series.folder)}
            >
              <div className="hover-area" id='outlineComponent'>
                {series.poster && (
                  <img
                    src={series.poster}
                    alt={series.title}
                    onError={(e) => {
                      console.warn("Series image failed to load:", e.target.src);
                      e.target.style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}