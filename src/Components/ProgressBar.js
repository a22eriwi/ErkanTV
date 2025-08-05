// Components/ProgressBar.js
import React from 'react';

export default function ProgressBar({ time, duration }) {
    if (!time || !duration || time < 1) return null;

    const percent = Math.min((time / duration) * 100, 100);

    return (
        <div className="progress-container">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
    );
}

