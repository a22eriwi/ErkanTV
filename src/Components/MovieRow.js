// src/components/MovieRow.js
import { useAuth } from '../authContext';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../Api';

export default function RenderMovieRow() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return null;
  return (
    <>
      {isLoggedIn && <MovieRow title="Most Watched Movies" topPicks={true} />}
    </>
  );
}

function MovieRow({ title, topPicks = false }) {
  const { isLoggedIn } = useAuth();
  const [movies, setMovies] = useState([]);
  const metadataCache = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        let movieList = [];

        if (topPicks) {
          const res = await api.get('/api/top-picks'); //
          movieList = res.data;
        } else {
          const res = await api.get('/api/movies');
          movieList = res.data;
        }

        const metadataPromises = movieList.map(async ({ filename, title, folder }) => {
          if (metadataCache.current[title]) {
            return {
              filename,
              folder,
              ...metadataCache.current[title],
            };
          }

          const metaRes = await api.get(`/api/metadata/${encodeURIComponent(title)}`);
          const metaData = metaRes.data;

          const metadata = {
            title: metaData.Title || title,
            poster: metaData.Poster && metaData.Poster !== 'N/A' ? metaData.Poster : null,
            imdbRating: metaData.imdbRating || 'N/A',
            genre: metaData.Genre || '',
          };

          metadataCache.current[title] = metadata;

          return {
            filename,
            folder,
            ...metadata,
          };
        });

        const movieWithMetadata = await Promise.all(metadataPromises);
        setMovies(movieWithMetadata);
      } catch (err) {
        console.error('Error fetching movies or metadata:', err);
      }
    };

    fetchMovies();
  }, [topPicks]);

  return (
    <>
      {isLoggedIn && (
        <div className='centreraCards'>
          <div className='homeComponent'>
            <h3>{title}</h3>
            <div className="cards" id='homeCards'>
              {movies.map((movie) => (
                <div
                  className="movie-card"
                  key={`${title}-${movie.filename}`}
                  onClick={() => navigate(`/movies/${encodeURIComponent(movie.folder)}`)}
                >
                  <div className="hover-area" id='outlineComponent'>
                    {movie.poster && (
                      <img
                        src={`${api.defaults.baseURL}/moviePosters/${encodeURIComponent(movie.folder)}.jpg`}
                        alt={movie.title}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

