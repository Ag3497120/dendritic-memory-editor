import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AuthCallback() {
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.split('?')[1]); // Extract query params from hash
        const token = params.get('token');

        if (token) {
            login(token);
            navigate('/dashboard', { replace: true });
        } else {
            // Handle error or no token case
            navigate('/login', { replace: true });
        }
    }, [login, navigate]);

    return (
        <div>
            <h1>Authenticating...</h1>
            <p>Please wait while we log you in.</p>
        </div>
    );
}
