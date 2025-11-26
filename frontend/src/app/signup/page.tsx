"use client";

import GoogleSignInButton from "@/components/google_signin_button/google_signin_button";
import { useAuth } from "@/contexts/auth";
import { googleAuth, signup } from "@/lib/api/auth";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { validatePassword, PASSWORD_MIN_LENGTH } from "@/lib/util/password-validation";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const passwordChecks = useMemo(() => {
        return [
            { label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
            { label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
            { label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(password) },
            { label: "At least one number (0-9)", met: /\d/.test(password) },
            { label: "At least one special character (!@#$%^&*...)", met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) },
            { label: "No leading or trailing spaces", met: password.length === 0 || (!password.startsWith(' ') && !password.endsWith(' ')) },
        ];
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const validation = validatePassword(password);
        if (!validation.isValid) {
            setError(validation.errors[0]);
            return;
        }

        setIsLoading(true);

        try {
            const response = await signup({
                email,
                password,
                full_name: fullName || undefined,
            });

            // Store token and user info in context
            login(response.access_token, response.user, response.expires);

            // Redirect based on user role
            if (response.user.role === 'admin') {
                router.push("/admin/dashboard");
            } else if (response.user.role === 'manager') {
                router.push("/manager/dashboard");
            } else {
                router.push("/home/dashboard");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (credential: string) => {
        setError("");
        setIsLoading(true);

        try {
            const response = await googleAuth(credential);

            // Store token and user info in context
            login(response.access_token, response.user, response.expires);

            // Redirect based on user role
            if (response.user.role === 'admin') {
                router.push("/admin/dashboard");
            } else if (response.user.role === 'manager') {
                router.push("/manager/dashboard");
            } else {
                router.push("/home/dashboard");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Google sign up failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = (error: string) => {
        setError(error);
    };

    return (
        <div className="w-full">
            <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
                            required
                            minLength={14}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    
                    {(passwordFocused || password.length > 0) && (
                        <div className="mt-3 p-3 bg-white dark:bg-white border border-gray-200 dark:border-gray-300 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                                Password Requirements:
                            </p>
                            <ul className="space-y-1.5">
                                {passwordChecks.map((check, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        {password.length > 0 ? (
                                            check.met ? (
                                                <Check size={16} className="text-green-600 flex-shrink-0" />
                                            ) : (
                                                <X size={16} className="text-red-500 flex-shrink-0" />
                                            )
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                                        )}
                                        <span className={`text-sm ${
                                            password.length === 0 
                                                ? 'text-gray-600' 
                                                : check.met 
                                                    ? 'text-green-700' 
                                                    : 'text-red-600'
                                        }`}>
                                            {check.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Creating Account..." : "Sign Up"}
                </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
            </div>

            {/* Google Sign-In */}
            <div className="mb-4 transform scale-110">
                <GoogleSignInButton
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="signup_with"
                />
            </div>

            {/* Login Link */}
            <p className="text-sm text-center mt-6">
                Already have an account?{" "}
                <a href="/login" className="text-green-600 font-semibold hover:underline">
                    Sign In
                </a>
            </p>
        </div>
    );
}

