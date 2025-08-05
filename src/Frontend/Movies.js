import { useAuth } from '../authContext';
import React, { useEffect, useState, useRef } from 'react';
import Header from '../Components/Header';
import { useNavigate } from 'react-router-dom';
import api from '../Api';

export default function RenderMovies() {
    const { isLoggedIn } = useAuth();
    if (!isLoggedIn) return null;
    return (
        <>
            {isLoggedIn && <Movies title="Movies" />}
        </>
    );
}

function Movies({ title }) {
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('');
    const metadataCache = useRef({});

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const res = await api.get('/api/movies');
                const movieList = res.data;

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
    }, []);

    const genres = Array.from(
        new Set(movies.flatMap((m) => m.genre?.split(', ').filter(Boolean)))
    );

    const filteredMovies = movies.filter((movie) => {
        const matchesSearch =
            movie.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            movie.genre?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesGenre = selectedGenre
            ? movie.genre?.includes(selectedGenre)
            : true;

        return matchesSearch && matchesGenre;
    });

    return (
        <>
            <Header />
            <div className='mainDiv'>
                <div className="movie-row">
                    <h3 className="msTitel">{title}</h3>
                    <div className='searchBox'>
                        <div className="sokDiv">
                            <input
                                type="text"
                                placeholder="Search movies..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="msSearch"
                            />
                        </div>
                        <div className="centreraCards">
                            <div className="genre-buttons">
                                <button
                                    onClick={() => setSelectedGenre('')}
                                    className={!selectedGenre ? 'active' : ''}
                                >
                                    All
                                </button>
                                {genres.map((genre, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedGenre(genre)}
                                        className={selectedGenre === genre ? 'active' : ''}
                                    >
                                        {genre}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className='centreraCards'>
                        <div className="cards">
                            {filteredMovies.map((movie, idx) => (
                                <div
                                    className="movie-card"
                                    key={`${title}-${movie.filename}`}
                                    onClick={() => {
                                        navigate(`/movies/${encodeURIComponent(movie.folder)}`);
                                    }}
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
            </div >
        </>
    );
}
