import axios from "axios"

// Backend API base URL - must include /api prefix
// Example: http://localhost:5001/api
const apiBaseUrl = import.meta.env.VITE_REACT_APP_URL;

export const axiosInstance = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true, // sending cookies in every request
    headers: {
        'Content-Type': 'application/json',
    },
})