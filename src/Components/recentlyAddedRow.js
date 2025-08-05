// src/components/RecentlyAddedRow.js
import { useAuth } from '../authContext';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../Api';

export default function RenderRecentlyAddedRow() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return null;
  return (
    <>
      {isLoggedIn && <RecentlyAddedRow title="Recently Added" />}
    </>
  );
}

function RecentlyAddedRow({ title, setSelectedMovie }) {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const metadataCache = useRef({});

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await api.get('/api/recent-content');
        const data = res.data;

        const enriched = await Promise.all(
          data.map(async (item) => {
            const cacheKey = item.title;
            if (metadataCache.current[cacheKey]) {
              return { ...item, ...metadataCache.current[cacheKey] };
            }

            let meta;
            try {
              if (item.type === 'movie') {
                const res = await api.get(`/api/metadata/${encodeURIComponent(item.title)}`);
                meta = res.data;
              } else {
                const folder = item.folder || item.seriesName;
                const res = await api.get(`/api/series-metadata/${encodeURIComponent(folder)}`);
                meta = res.data;
              }
            } catch (err) {
              console.warn(`Failed to load metadata for: ${item.title}`);
              return item;
            }

            const metadata = {
              title: meta.Title || item.title || item.seriesName,
              imdbRating: meta.imdbRating || 'N/A',
              genre: meta.Genre || '',
              folder: meta.folder || item.seriesName || item.folder,
              Poster: meta.Poster || null,
            };

            metadataCache.current[cacheKey] = metadata;

            return { ...item, ...metadata };
          })
        );

        setItems(enriched);
      } catch (err) {
        console.error('Failed to load recent items:', err);
      }
    };

    fetchRecent();
  }, []);

  return (
    <>
     {isLoggedIn && (
    <div className='centreraCards'>
      <div className='homeComponent'>
        <h3>{title}</h3>
        <div className="cards" id='homeCards'>
          {items.map(item => {
            const folderName = item.folder || item.seriesName || item.title;

            return (
              <div
                key={`${item.type}-${item.title}`}
                className="movie-card"
                onClick={() => {
                  if (item.type === 'movie') {
                    navigate(`/movies/${encodeURIComponent(item.folder)}`);
                  } else {
                    navigate(`/series/${encodeURIComponent(item.seriesName)}`);
                  }
                }}
              >
                <div className="hover-area" id='outlineComponent'>
                  <img
                    src={`${api.defaults.baseURL}/${item.type === 'movie' ? 'moviePosters' : 'seriesPosters'}/${encodeURIComponent(folderName)}.jpg`}
                    alt={item.title}
                    onError={(e) => {
                      console.warn('Image failed to load:', e.target.src);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    )}
    </>
  );
}