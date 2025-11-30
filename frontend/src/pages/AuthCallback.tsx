import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            login(token);
            navigate('/dashboard', { replace: true });
        } else {
            // Handle error or no token case
            navigate('/login', { replace: true });
        }
    }, [searchParams, login, navigate]);

    return (
        <div>
            <h1>Authenticating...</h1>
            <p>Please wait while we log you in.</p>
        </div>
    );
}
