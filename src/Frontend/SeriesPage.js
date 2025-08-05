import { useAuth } from '../authContext';
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../Components/Header';
import api from '../Api';
import ProgressBar from '../Components/ProgressBar';

function RenderSeriesPage() {
    const { isLoggedIn } = useAuth();
    if (!isLoggedIn) return null;
    return (
        <>
            {isLoggedIn && <SeriesPage title="SeriesPage" />}
        </>
    );
}

function SeriesPage() {
    const { isLoggedIn } = useAuth();
    const { seriesName } = useParams();
    const navigate = useNavigate();
    const [lastWatchedPath, setLastWatchedPath] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [availableSeasons, setAvailableSeasons] = useState([]);
    const [currentSeason, setCurrentSeason] = useState('');
    const [activeTab, setActiveTab] = useState('Episodes');
    const [suggestedSeries, setSuggestedSeries] = useState([]);
    const [seasonMap, setSeasonMap] = useState({});
    const [episodeProgress, setEpisodeProgress] = useState({});

    //Last watched episode fetch
    useEffect(() => {
        const fetchLastWatched = async () => {
            try {
                const res = await api.get(`/api/progress/last-series-episode?seriesName=${encodeURIComponent(seriesName)}`);

                const pathToUse = res.data.fullPath || res.data.fileName;
                setLastWatchedPath(pathToUse);
            } catch (err) {
                console.warn('No resume data found for this series.');
            }
        };

        fetchLastWatched();
    }, [seriesName]);

    //Fetch progress for watched episodes to enable progress bar
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await api.get(`/api/progress/all-for-series?seriesName=${encodeURIComponent(seriesName)}`);

                const watched = new Set();
                const episodeProgressMap = {};

                res.data.forEach(item => {
                    if (item.time && item.duration) {
                        if ((item.time / item.duration) > 0.96) {
                            watched.add(item.fullPath);
                        }

                        episodeProgressMap[item.fullPath] = {
                            time: item.time,
                            duration: item.duration
                        };
                    }
                });

                setEpisodeProgress(episodeProgressMap); //  new state
            } catch (err) {
                console.warn('Could not fetch watch progress for this series.');
            }
        };

        fetchProgress();
    }, [seriesName]);


    //Fetch metadata for series
    useEffect(() => {
        if (!seriesName) return;

        const fetchMetadata = async () => {
            try {
                const res = await api.get(`/api/series-metadata/${encodeURIComponent(seriesName)}`);
                setMetadata(res.data);
            } catch (err) {
                console.error('Failed to fetch series metadata:', err);
            }
        };

        const fetchSeasons = async () => {
            try {
                const res = await api.get(`/api/series/${encodeURIComponent(seriesName)}`);
                const data = res.data;

                const grouped = {};
                for (const { season, episodes } of data.seasons) {
                    grouped[season] = episodes;
                }

                const allSeasons = Object.keys(grouped);

                // Determine default season
                let defaultSeason = allSeasons[0];
                if (lastWatchedPath) {
                    for (const season of allSeasons) {
                        if (grouped[season].some(ep => ep.path === lastWatchedPath)) {
                            defaultSeason = season;
                            break;
                        }
                    }
                }

                setSeasonMap(grouped);
                setAvailableSeasons(allSeasons);
                setCurrentSeason(defaultSeason);
                setEpisodes(grouped[defaultSeason]);
            } catch (err) {
                console.error('Failed to fetch seasons:', err);
            }
        };

        fetchMetadata();
        fetchSeasons();
    }, [seriesName, lastWatchedPath]); // Keep lastWatchedPath to update default season if available


    //Fetch suggested series
    useEffect(() => {
        if (!metadata?.Genre) return;

        const fetchSuggested = async () => {
            try {
                const res = await api.get('/api/series-metadata');
                const allMetadata = res.data;

                const currentGenres = metadata.Genre.split(',').map((g) => g.trim().toLowerCase());

                const suggestions = Object.entries(allMetadata)
                    .filter(([folder, data]) => {
                        if (folder === seriesName) return false;
                        if (!data.Genre) return false;
                        const otherGenres = data.Genre.split(',').map((g) => g.trim().toLowerCase());
                        return currentGenres.some((g) => otherGenres.includes(g));
                    })
                    .map(([folder, data]) => ({
                        folder,
                        title: data.Title,
                        poster: data.Poster,
                    }));

                setSuggestedSeries(suggestions);
            } catch (err) {
                console.error('Error fetching suggested series:', err);
            }
        };

        fetchSuggested();
    }, [metadata, seriesName]);

    useEffect(() => {
        if (currentSeason && seasonMap[currentSeason]) {
            setEpisodes(seasonMap[currentSeason]);
        }
    }, [currentSeason, seasonMap]);

    function SeasonDropdown({ availableSeasons, currentSeason, setCurrentSeason }) {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef();

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        return (
            <div className="season-dropdown" ref={dropdownRef}>
                <button className="dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
                    <span>{currentSeason}</span>
                    <span>▼</span>
                </button>
                {isOpen && (
                    <div className="dropdown-menu">
                        {availableSeasons.map((season) => (
                            <div
                                key={season}
                                className={`dropdown-item ${currentSeason === season ? 'active' : ''}`}
                                onClick={() => {
                                    setCurrentSeason(season);
                                    setIsOpen(false);
                                }}
                            >
                                {season}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <Header />
            <div className="mainDiv">
                {isLoggedIn && (
                    <div className="movie-row" id="movie-row-Home">
                        <div className="centreraCards">
                            <div className="componentDiv">
                                <div className='movieComponent'>
                                    <h3 className="msTitel">
                                        {metadata?.Title || seriesName} ⭐{metadata?.imdbRating}
                                    </h3>
                                    {lastWatchedPath && (
                                        <button
                                            className="play-button"
                                            onClick={() => navigate(`/watch?path=${encodeURIComponent(lastWatchedPath)}`)}
                                        >
                                            ▶ Resume
                                        </button>
                                    )}
                                </div>
                                <ul className="tablist">
                                    {['Episodes', 'Suggested', 'Details'].map((tab) => (
                                        <li
                                            key={tab}
                                            className={activeTab === tab ? 'active' : ''}
                                            onClick={() => setActiveTab(tab)}
                                        >
                                            {tab}
                                        </li>
                                    ))}
                                </ul>

                                {activeTab === 'Episodes' && (
                                    <>
                                        <div className="season-select-wrapper">
                                            <SeasonDropdown
                                                availableSeasons={availableSeasons}
                                                currentSeason={currentSeason}
                                                setCurrentSeason={setCurrentSeason}
                                            />
                                        </div>

                                        <div className="cards" id="episodeCards">
                                            {episodes
                                                .sort((a, b) => {
                                                    const getEpNum = (title) => {
                                                        const match = title.match(/^(\d+)[. -]?/);
                                                        return match ? parseInt(match[1], 10) : 0;
                                                    };
                                                    return getEpNum(a.title) - getEpNum(b.title);
                                                })
                                                .map((episode) => {

                                                    return (
                                                        <div
                                                            className="episode-card"
                                                            key={episode.path}
                                                            onClick={() =>
                                                                navigate(`/watch?path=${encodeURIComponent(episode.path)}`)
                                                            }
                                                        >
                                                            <div className="hover-area">
                                                                <div className="img-wrapper">
                                                                    <img
                                                                        src={`${api.defaults.baseURL}/seriesPosters/${encodeURIComponent(seriesName)}.jpg`}
                                                                        alt={episode.title}
                                                                    />
                                                                    <ProgressBar
                                                                        time={episodeProgress[episode.path]?.time}
                                                                        duration={episodeProgress[episode.path]?.duration}
                                                                    />
                                                                </div>
                                                                <span className="seriesTitle">{episode.title}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'Suggested' && (
                                    <div className="cards" id="suggestedCards">
                                        {suggestedSeries.length === 0 ? (
                                            <p>No suggestions found.</p>
                                        ) : (
                                            suggestedSeries.map((s) => (
                                                <div
                                                    key={s.folder}
                                                    className="movie-card"
                                                    onClick={() =>
                                                        (window.location.href = `/series/${encodeURIComponent(s.folder)}`)
                                                    }
                                                >
                                                    <div className="hover-area" id='outlineComponent'>
                                                        <img
                                                            src={`${api.defaults.baseURL}/seriesPosters/${encodeURIComponent(s.folder)}.jpg`}
                                                            alt={s.title || s.folder}
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
                )}
            </div>
        </>
    );
}

export default RenderSeriesPage;