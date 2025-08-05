import { useAuth } from '../authContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Components/Header';
import api from '../Api';

function Series() {
    const { isLoggedIn } = useAuth();
    if (!isLoggedIn) return null;

    return (
        <>
            <Header />
            <SeriesRow title="Series" />
        </>
    );
}

function SeriesRow() {
    const navigate = useNavigate();
    const { isLoggedIn } = useAuth();

    const [seriesList, setSeriesList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('');
    const [genres, setGenres] = useState([]);

    useEffect(() => {
        const fetchSeries = async () => {
            try {
                const res = await api.get('/api/series');
                const folders = res.data;

                const seriesWithMetadata = await Promise.all(
                    folders.map(async (folder) => {
                        const metaRes = await api.get(`/api/series-metadata/${encodeURIComponent(folder)}`);
                        const metaData = metaRes.data;

                        return {
                            folder,
                            poster: `${api.defaults.baseURL}/seriesPosters/${encodeURIComponent(folder)}.jpg`,
                            title: metaData.Title || folder,
                            imdbRating: metaData.imdbRating || 'N/A',
                            genre: metaData.Genre || '',
                        };
                    })
                );

                setSeriesList(seriesWithMetadata);

                const allGenres = seriesWithMetadata.flatMap(series =>
                    series.genre.split(',').map(g => g.trim())
                );
                setGenres([...new Set(allGenres)]);
            } catch (err) {
                console.error('Error fetching series:', err);
            }
        };

        fetchSeries();
    }, []);

    const filteredSeriesList = seriesList.filter(series => {
        const matchesSearch = series.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGenre = !selectedGenre || (series.genre && series.genre.toLowerCase().includes(selectedGenre.toLowerCase()));
        return matchesSearch && matchesGenre;
    });

    return (
        <div className="mainDiv">
            {isLoggedIn && (
                <div className="movie-row">
                    <h3 className="msTitel">Series</h3>

                    <div className='searchBox'>
                        <div className="sokDiv">
                            <input
                                type="text"
                                placeholder="Search series..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="msSearch"
                            />
                        </div>
                        <div className='centreraCards'>
                            <div className="genre-buttons">
                                <button
                                    onClick={() => setSelectedGenre('')}
                                    className={!selectedGenre ? 'active' : ''}
                                >
                                    All
                                </button>
                                {genres.map((genre, idx) => (
                                    <button
                                        key={idx}
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
                            {filteredSeriesList.map((series) => (
                                <div
                                    key={series.folder}
                                    className="movie-card"
                                    onClick={() => navigate(`/series/${encodeURIComponent(series.folder)}`)}
                                >
                                    <div className="hover-area" id='outlineComponent'>
                                        <img
                                            src={series.poster}
                                            alt={series.title}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Series;
