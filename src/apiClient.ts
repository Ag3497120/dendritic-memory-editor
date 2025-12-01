import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  exp: number;
  // Add other properties from your JWT payload if needed
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token in headers only if it's valid
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          // Token is expired, remove it
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        // Failed to decode, token is invalid
        console.error("Invalid token found, removing from storage:", error);
        localStorage.removeItem('authToken');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
