// src/components/Watch.js
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../Api';
import { useAuth } from '../authContext';

export default function Watch() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const path = searchParams.get('path');
    const movieFolder = searchParams.get('movie');
    const navigate = useNavigate();
    const { accessToken } = useAuth();
    const videoRef = useRef(null);
    const [videoFileName, setVideoFileName] = useState('');
    const [contentType, setContentType] = useState('movie');
    const { user } = useAuth();
    const [hasSubtitle, setHasSubtitle] = useState(false);
    const [showNextButton, setShowNextButton] = useState(false);
    const [metadata, setMetadata] = useState(null);
    const [nextEpisodePath, setNextEpisodePath] = useState(null);
    const containerRef = useRef(null);
    const autoSaveInterval = useRef(null);

    const saveProgress = () => {
        if (videoRef.current && user && videoFileName) {
            const time = videoRef.current.currentTime;
            const duration = videoRef.current.duration;

            return api.post('/api/progress', {
                fileName: videoFileName,
                type: contentType,
                time,
                duration,
                ...(contentType === 'series' && path ? { fullPath: path } : {})
            });
        }
        return Promise.resolve();
    };

    //Save progress for series and movies
    useEffect(() => {
        const autoSave = () => {
            if (
                videoRef.current &&
                user &&
                videoFileName &&
                videoRef.current.duration > 0 &&
                videoRef.current.currentTime > 0
            ) {
                const time = videoRef.current.currentTime;
                const duration = videoRef.current.duration;

                api.post('/api/progress', {
                    fileName: videoFileName,
                    type: contentType,
                    time,
                    duration,
                    ...(contentType === 'series' && path ? { fullPath: path } : {})
                }).catch(err => console.error(' Auto-save error:', err.response?.data || err.message));
            }
        };

        autoSaveInterval.current = setInterval(autoSave, 1000);

        return () => {
            autoSave(); // final save
            clearInterval(autoSaveInterval.current);
        };
    }, [videoFileName, contentType, user, path]);

    useEffect(() => {
        if (movieFolder) {
            const fetchMetadata = async () => {
                try {
                    const res = await api.get(`/api/movie-metadata/${encodeURIComponent(movieFolder)}`);
                    setMetadata(res.data);
                } catch (err) {
                    console.error(' Failed to load movie metadata:', err);
                }
            };
            fetchMetadata();
        }
    }, [movieFolder]);

    useEffect(() => {
        if (path) {
            const filename = path.split('/').pop();
            setVideoFileName(filename);
            setContentType('series');
        } else if (movieFolder && metadata?.filename) {
            setVideoFileName(metadata.filename);
            setContentType('movie');
        }
    }, [path, movieFolder, metadata]);

    //Fetch progress
    useEffect(() => {
        const fetchProgress = async () => {
            if (videoFileName) {
                try {
                    const res = await api.get(`/api/progress?fileName=${videoFileName}`);
                    const savedTime = res.data?.time;
                    if (videoRef.current && savedTime) {
                        videoRef.current.currentTime = savedTime;
                    }
                } catch (err) {
                    console.error(' Fetch progress error:', err.response?.data || err.message);
                }
            }
        };
        fetchProgress();
    }, [videoFileName]);

    //Keeps track of current video progress (used for rendering next episode button)
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (video.duration) {
                const progress = video.currentTime / video.duration;
                if (progress > 0.90 && !showNextButton) {
                    setShowNextButton(true);
                } else if (progress <= 0.90 && showNextButton) {
                    setShowNextButton(false);
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [path, showNextButton]);

    //Find the next episode in order to play it when the current one is done
    useEffect(() => {
        const fetchNextEpisode = async () => {
            if (!path) return;

            const parts = path.split('/');
            const currentFilename = parts.at(-1);
            const seasonFolder = parts.at(-2);
            const seriesName = parts.slice(0, -2).join('/'); 

            try {
                const res = await api.get(`/api/series/${encodeURIComponent(seriesName)}`);
                if (!res.data?.seasons) {
                    console.warn('Missing "seasons" in response');
                    return;
                }

                const seasonData = res.data.seasons.find(s => s.season === seasonFolder);
                if (!seasonData) {
                    console.warn(`Season '${seasonFolder}' not found`);
                    return;
                }

                const sortedEpisodes = seasonData.episodes.sort((a, b) => {
                    const num = (title) => parseInt(title.match(/\d+/)?.[0] || '0', 10);
                    return num(a.title) - num(b.title);
                });

                const currentIndex = sortedEpisodes.findIndex(ep =>
                    ep.path.endsWith(currentFilename)
                );

                const nextEpisode = sortedEpisodes[currentIndex + 1];

                if (nextEpisode) {
                    setNextEpisodePath(nextEpisode.path);
                }
            } catch (err) {
                console.error('Failed to fetch next episode:', err);
            }
        };

        fetchNextEpisode();
    }, [path]);

    const videoUrl = (() => {
        if (path && accessToken) {
            return `${api.defaults.baseURL}/api/stream/file?path=${encodeURIComponent(path)}&token=${accessToken}`;
        }

        if (movieFolder && metadata?.filename && accessToken) {
            return `${api.defaults.baseURL}/api/stream/movie/${encodeURIComponent(movieFolder)}/${encodeURIComponent(metadata.filename)}?token=${accessToken}`;
        }

        return null;
    })();

    useEffect(() => {
        setShowNextButton(false);
    }, [path]);

    return (
        <div key={path} className="video-overlay">
            <div className="video-wrapper" ref={containerRef}>
                <div className='titleBox'>
                    <button className="close-button" onClick={() => {
                        if (contentType === 'series') {
                            const seriesName = path.split('/').slice(0, -2).join('/');
                            navigate(`/series/${encodeURIComponent(seriesName)}`);
                        } else {
                            navigate(-1);
                        }
                    }}>✖</button>
                    {(contentType === 'movie' && metadata?.Title) && (
                        <h2 className="movieTitle">{metadata.Title}</h2>
                    )}
                    {contentType === 'series' && path && (
                        <h2 className="movieTitle">
                            {(() => {
                                const parts = path.split('/');
                                const episodeFile = parts[parts.length - 1];
                                const episodeTitle = episodeFile.replace(/\.[^.]+$/, '').replace(/[._]/g, ' ');
                                return `${episodeTitle}`;
                            })()}
                        </h2>
                    )}
                </div>
                {showNextButton && nextEpisodePath && nextEpisodePath !== path && (
                    <button
                        className="next-episode-button"
                        onClick={async () => {
                            setShowNextButton(false);
                            clearInterval(autoSaveInterval.current);

                            try {
                                await saveProgress(); // Save exact currentTime
                            } catch (err) {
                                console.error("Failed to save progress before skipping episode:", err);
                            }

                            // Delay navigate to ensure state has updated
                            setTimeout(() => {
                                navigate(`/watch?path=${encodeURIComponent(nextEpisodePath)}`, { replace: true });
                            }, 100); // small buffer
                        }}
                    >
                        ▶ Next Episode
                    </button>
                )}

                <div className="video-container">
                    {videoUrl ? (
                        <video
                            ref={videoRef}
                            className="video-player"
                            autoPlay
                            crossOrigin="anonymous"
                            controls
                            controlsList="nodownload noplaybackrate"
                            disablePictureInPicture
                        >
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <p>Loading video...</p>
                    )}
                </div>
            </div>
        </div>
    );
}
