import { useAuth } from '../authContext';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../Components/Header';
import RenderSeriesRow from '../Components/SeriesRow';
import RenderMovieRow from '../Components/MovieRow';
import RenderRecentlyAddedRow from '../Components/recentlyAddedRow';

function Home() {
    const location = useLocation();
    const { isLoggedIn } = useAuth();
    const [selectedMovie, setSelectedMovie] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const play = params.get('play');
        const folder = params.get('folder');

        if (!play && selectedMovie) {
            setSelectedMovie(null);
        }

        if (play && folder && !selectedMovie) {
            setSelectedMovie({ filename: play, folder });
        }
    }, [location.search, selectedMovie]);

    return (
        <>
            <Header />
            <div className='mainDiv'>
                <Banner />
                {isLoggedIn && <HomeContent selectedMovie={selectedMovie} setSelectedMovie={setSelectedMovie} />}
            </div>
        </>
    );
}

function HomeContent({ selectedMovie, setSelectedMovie }) {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    if (!isLoggedIn) return null;

    return (
        <div className='homeDiv'>
            <div className="movie-row" id='movie-row-Home'>
                <RenderRecentlyAddedRow
                    title="Recently added"
                    selectedMovie={selectedMovie}
                    setSelectedMovie={(movie) => {
                        setSelectedMovie({ filename: movie.filename, folder: movie.folder });
                        navigate(`?play=${encodeURIComponent(movie.filename)}&folder=${encodeURIComponent(movie.folder)}`);
                    }}
                />
                <RenderMovieRow
                    selectedMovie={selectedMovie}
                    setSelectedMovie={(movie) => {
                        setSelectedMovie({ filename: movie.filename, folder: movie.folder });
                        navigate(`?play=${encodeURIComponent(movie.filename)}&folder=${encodeURIComponent(movie.folder)}`);
                    }}
                    topPicks={true}
                />
                <RenderSeriesRow
                    onSelectSeries={(seriesName) => navigate(`/series?name=${encodeURIComponent(seriesName)}`)}
                    topSeries={true}
                />
            </div>
        </div>
    );
}

function Banner() {
    const { isLoggedIn, user } = useAuth();
    if (!isLoggedIn) return null;

    return (
        <div className="banner">
            {isLoggedIn ? (
                <div className="Align">
                    <h1 className="valkommen">
                        Welcome to ErkanTV <span className="namnRubrik">{user.name}</span>!
                    </h1>
                </div>
            ) : (
                <>
                    <div className="Align">
                        <h1 className="valkommen">Welcome to ErkanTV</h1>
                    </div>
                    <h3 className="valkommen2">Please sign in to access the content!</h3>
                </>
            )}
        </div>
    );
}

export default Home;
