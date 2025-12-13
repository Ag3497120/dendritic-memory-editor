import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../apiClient';
import { LoginButtons } from '../components/LoginButtons';
import { jwtDecode } from 'jwt-decode';
import { DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function Login() {
    const [npiNumber, setNpiNumber] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
        setIsLoading(true);
        try {
            const response = await apiClient.post('/api/auth/npi', { npiNumber });
            if (response.data.token) {
                handleLoginSuccess(response.data.token);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'NPI login failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
            {/* Left side - Info */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-8">
                <div className="max-w-md">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                            <DocumentTextIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dendritic</h1>
                            <p className="text-gray-500 dark:text-gray-400">Memory Editor</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Manage Your Knowledge
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                        Create, organize, and share knowledge tiles across multiple domains. Powered by advanced MCP inference capabilities.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">✓</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Intelligent Search</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Find relevant knowledge tiles across all domains instantly</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">✓</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">AI-Powered Inference</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Generate insights and answers using advanced language models</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">✓</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Secure & Reliable</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Enterprise-grade security with OAuth integration</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center">
                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Welcome Back
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Sign in to your account to continue
                            </p>
                        </div>

                        {/* OAuth Buttons */}
                        <div className="space-y-3 mb-6">
                            <LoginButtons />
                        </div>

                        {/* Divider */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        {/* NPI Login */}
                        <form onSubmit={handleNpiLogin} className="space-y-4 mb-6">
                            <div>
                                <label htmlFor="npi" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    NPI Number
                                </label>
                                <input
                                    id="npi"
                                    type="text"
                                    value={npiNumber}
                                    onChange={(e) => setNpiNumber(e.target.value)}
                                    placeholder="10-digit NPI for medical experts"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Login with NPI
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
                                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Guest Link */}
                        <div className="text-center">
                            <Link
                                to="/all-tiles"
                                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                            >
                                Continue as Guest
                                <ArrowRightIcon className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-gray-500 dark:text-gray-400 text-xs mt-6">
                        By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
}
