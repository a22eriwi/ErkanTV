// src/components/MoviePage.js
import { useAuth } from '../authContext';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../Components/Header';
import api from '../Api';
import ProgressBar from '../Components/ProgressBar';

export default function RenderMoviePage() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return null;
  return (
    <>
      {isLoggedIn && <MoviePage title="MoviePage" />}
    </>
  )
}

function MoviePage() {
  const { isLoggedIn } = useAuth();
  const { movieFolder } = useParams();
  const [metadata, setMetadata] = useState(null);
  const [activeTab, setActiveTab] = useState('Suggested');
  const [suggestedMovies, setSuggestedMovies] = useState([]);
  const navigate = useNavigate();
  const metadataCache = useRef({});
  const [progress, setProgress] = useState({ time: 0, duration: 0 });


  useEffect(() => {
    if (!movieFolder) return;

    const fetchMetadata = async () => {
      try {
        const res = await api.get(`/api/movie-metadata/${encodeURIComponent(movieFolder)}`);
        const data = res.data;
        setMetadata(data);
        metadataCache.current[data.Title] = {
          genre: data.Genre || '',
        };
      } catch (err) {
        console.error('Failed to fetch movie metadata:', err);
      }
    };

    fetchMetadata();
  }, [movieFolder]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!metadata?.filename) return;

      try {
        const res = await api.get(`/api/progress?fileName=${encodeURIComponent(metadata.filename)}`);
        const time = res.data?.time || 0;
        const dur = res.data?.duration || 0;
        setProgress({ time, duration: dur });
      } catch (err) {
        console.warn('No progress found for this movie.');
      }
    };

    fetchProgress();
  }, [metadata]);

  useEffect(() => {
    if (!metadata?.Genre) return;

    const fetchSuggested = async () => {
      try {
        const [movieListRes, metaRes] = await Promise.all([
          api.get('/api/movies'),
          api.get('/api/movie-metadata'),
        ]);

        const movieList = movieListRes.data;
        const allMetadata = metaRes.data;

        Object.values(allMetadata).forEach((meta) => {
          metadataCache.current[meta.Title] = {
            genre: meta.Genre || '',
            filename: meta.filename,
          };
        });

        const currentGenres = metadata.Genre.split(',').map((g) => g.trim().toLowerCase());

        const filteredSuggestions = movieList.filter(({ title, folder }) => {
          const meta = metadataCache.current[title];
          if (!meta || folder === movieFolder) return false;
          const otherGenres = meta.genre.split(',').map((g) => g.trim().toLowerCase());
          return currentGenres.some((g) => otherGenres.includes(g));
        });

        // Fetch progress in parallel for each suggested movie
        const withProgress = await Promise.all(
          filteredSuggestions.map(async (movie) => {
            const meta = metadataCache.current[movie.title];
            let progress = null;

            if (meta?.filename) {
              try {
                const res = await api.get(`/api/progress?fileName=${encodeURIComponent(meta.filename)}`);
                progress = res.data || null;
              } catch {
                // no progress found — ignore
              }
            }

            return {
              ...movie,
              progress,
            };
          })
        );

        setSuggestedMovies(withProgress);
      } catch (err) {
        console.error('Error fetching suggested movies or progress:', err);
      }
    };

    fetchSuggested();
  }, [metadata, movieFolder]);

  return (
    <>
      <Header />
      {isLoggedIn && (
        <div className="mainDiv">
          <div className="movie-row" id="movie-row-Home">
            <div className="centreraCards">
              <div className="componentDiv">
                <div className='movieComponent'>
                  <h3 className="msTitel">
                    {metadata?.Title || movieFolder} ⭐{metadata?.imdbRating}
                  </h3>
                  {metadata && (
                    <div className="movieWrapper">
                      <img
                        className="poster"
                        src={`${api.defaults.baseURL}/moviePosters/${encodeURIComponent(movieFolder)}.jpg`}
                        alt={metadata.Title}
                      />
                      <ProgressBar
                        time={progress.time}
                        duration={progress.duration}
                      />
                    </div>
                  )}
                  <button
                    className="play-button"
                    onClick={() => navigate(`/watch?movie=${encodeURIComponent(movieFolder)}`)}
                  >
                    <p>▶</p>
                    <p>{progress.time > 0 ? 'Resume' : 'Play'}</p>
                  </button>
                </div>

                <ul className="tablist">
                  <li
                    className={activeTab === 'Suggested' ? 'active' : ''}
                    onClick={() => setActiveTab('Suggested')}
                  >
                    Suggested
                  </li>
                  <li
                    className={activeTab === 'Details' ? 'active' : ''}
                    onClick={() => setActiveTab('Details')}
                  >
                    Details
                  </li>
                </ul>

                {activeTab === 'Suggested' && (
                  <div className="cards" id="suggestedCards">
                    {suggestedMovies.length === 0 ? (
                      <p>No suggestions found.</p>
                    ) : (
                      suggestedMovies.map((movie) => (
                        <div
                          key={movie.filename}
                          className="movie-card"
                          onClick={() =>
                            navigate(`/movies/${encodeURIComponent(movie.folder)}`)
                          }
                        >
                          <div className="hover-area" id='outlineComponent'>
                            <img
                              src={`${api.defaults.baseURL}/moviePosters/${encodeURIComponent(movie.folder)}.jpg`}
                              alt={movie.title}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'Details' && (
                  <div className="details">
                    <div className="details-wrapper">
                      <div className="plot">
                        <p className="detailsTitle">Plot:</p>
                        <p>{metadata?.Plot}</p>
                      </div>
                      <div className="genre">
                        <div className="detailsDiv">
                          <p className="detailsTitle">Released:</p>
                          <p>{metadata?.Released}</p>
                        </div>
                        <p className="detailsTitle">Genre:</p>
                        <p>{metadata?.Genre}</p>
                      </div>
                      <div className="starring">
                        <div className="detailsDiv">
                          <p className="detailsTitle">Director:</p>
                          <p>{metadata?.Director}</p>
                        </div>
                        <div className="detailsDiv">
                          <p className="detailsTitle">Starring:</p>
                          <div>
                            {metadata?.Actors?.split(',').map((actor, i) => (
                              <p key={i}>{actor.trim()}</p>
                            ))}
                          </div>
                        </div>
                        <div className="detailsDiv">
                          <p className="detailsTitle">Awards:</p>
                          <p>{metadata?.Awards}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
