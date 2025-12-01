import { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import apiClient from '../apiClient';
import { LoginButtons } from '../components/LoginButtons';
import { jwtDecode } from 'jwt-decode';

export default function Login() {
    const [npiNumber, setNpiNumber] = useState('');
    const [error, setError] = useState('');

    const handleLoginSuccess = (token: string) => {
        localStorage.setItem('authToken', token);
        try {
            const decoded: any = jwtDecode(token);
            if (decoded.sub) localStorage.setItem('user_id', decoded.sub);
            if (decoded.email) localStorage.setItem('user_email', decoded.email);
        } catch (e) {
            console.error("Could not decode token from NPI login", e);
        }
        window.location.reload();
    };

    const handleNpiLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!npiNumber.trim()) {
            setError('NPI number cannot be empty.');
            return;
        }
        try {
            const response = await apiClient.post('/api/oauth/npi/verify', { npiNumber });
            if (response.data.token) {
                handleLoginSuccess(response.data.token);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'NPI login failed.');
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">Login to Dendritic Memory</h2>
                    <p className="text-gray-500">Choose a provider to continue</p>
                </div>
                
                <div className="space-y-4">
                    <LoginButtons />
                    
                    <Link 
                        to="/all-tiles"
                        className="block text-center w-full py-3 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-300 font-semibold"
                    >
                        Continue as Guest
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 text-center mb-4">NPI Login
                        <span className="ml-2 text-sm font-normal text-gray-500">(for US Medical Experts)</span>
                    </h3>
                    <form onSubmit={handleNpiLogin} className="space-y-4">
                        <input 
                            type="text" 
                            value={npiNumber}
                            onChange={(e) => setNpiNumber(e.target.value)}
                            placeholder="Enter your 10-digit NPI number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                        />
                        <button 
                            type="submit" 
                            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-semibold"
                        >
                            Login with NPI
                        </button>
                    </form>
                </div>
                {error && <p className="mt-4 text-center text-red-500 text-sm">{error}</p>}
            </div>
        </div>
    );
}
