import './CSS/stylesBigDesktop.css'
import './CSS/stylesDesktop.css'
import './CSS/stylesAlmostDesktop.css'
import './CSS/stylesLargeTablet.css'
import './CSS/stylesMediumTablet.css'
import './CSS/stylesTablet.css'
import './CSS/stylesMobile.css'
import './CSS/stylesSmallMobile.css'
import './index';

import { Routes, Route, Outlet } from 'react-router-dom';
import Login from './Frontend/Login';
import Register from './Frontend/Register';
import Home from './Frontend/Home';
import AdminDashboard from './Frontend/AdminDashboard';
import Wish from './Frontend/Wish';
import Series from './Frontend/Series';
import Movies from './Frontend/Movies';
import RenderSeriesPage from './Frontend/SeriesPage';
import RenderMoviePage from './Frontend/MoviePage';
import Watch from './Frontend/Watch';
import LandingPage from './Frontend/LandingPage';

import ProtectedRoute from './ProtectedRoute';

import { setTokenGetter } from './Api';
import { useAuth } from './authContext';
import { useEffect } from 'react';

function AppWrapper() {
  const { accessToken } = useAuth();

  useEffect(() => {
    setTokenGetter(() => accessToken);
  }, [accessToken]);

  return <App />;
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/wish" element={<Wish />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:movieFolder" element={<RenderMoviePage />} />
        <Route path="/series" element={<Outlet />}>
          <Route index element={<Series />} />
          <Route path=":seriesName" element={<RenderSeriesPage />} />
        </Route>
        <Route path="/watch" element={<Watch />} />
      </Route>
    </Routes>
  );
}

export default AppWrapper;
