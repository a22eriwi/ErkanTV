// src/Api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // to send the refresh cookie
});

let store = {
  getToken: () => null,
};

export const setTokenGetter = (getterFn) => {
  store.getToken = getterFn;
};

api.interceptors.request.use((config) => {
  const token = store.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;