import React, { useState } from 'react';
import { toast } from 'react-toastify';

// --- SVG Icons for UI Elements ---
const LogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
);
const EmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);
const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H4.5a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
);
const EyeIcon = ({ slashed }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        {slashed ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        )}
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.565-3.343-11.114-7.943l-6.571,4.819C9.656,39.663,16.318,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.712,34.464,44,28.099,44,20C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);
const AppleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.65 15.634c-.053.003-.106.003-.158 0-1.29.07-2.24-1.2-3.32-2.31-.99-1.02-1.92-2.14-1.92-3.35 0-1.28.98-2.23 2.11-2.23.18 0 .36.02.53.05-1.12-1.4-2.8-1.78-4.22-1.82-2.11-.07-4.13.98-5.32 2.74-1.42 2.1-1.05 5.25.72 7.2l.02.02c.9.9 1.94 1.48 3.14 1.48 1.07 0 2.12-.4 3.11-1.15.93-.7 1.63-1.61 2.08-2.61zm-4.32-9.764c.98-.99 1.6-2.26 1.43-3.52-.92.08-2.1.6-3.1 1.58-.88.88-1.63 2.15-1.44 3.39.93-.05 2.16-.48 3.11-1.45z"/>
    </svg>
);
const MicrosoftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="20px" height="20px">
        <path fill="#f25022" d="M1 1h9v9H1z"/>
        <path fill="#00a4ef" d="M1 11h9v9H1z"/>
        <path fill="#7fba00" d="M11 1h9v9h-9z"/>
        <path fill="#ffb900" d="M11 11h9v9h-9z"/>
    </svg>
);


const LoginPage = ({ onLogin, error }) => {
    const [email, setEmail] = useState('sasmitarout.official@gmail.com');
    const [password, setPassword] = useState('Suchi@2001');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="login-page">
            <div className="login-wrapper">
                <div className="login-promo-section">
                    <div className="login-logo">
                        <img src="https://mma.prnewswire.com/media/1196052/Accion_Labs_Logo.jpg" alt="AccionLabs" style={{ height: '60px', borderRadius: '8px', padding: '5px', backgroundColor: 'white' }} />
                    </div>
                    <div className="login-promo-content">
                        <h2>Unlock Potential. Streamline Recruitment.</h2>
                        <p className="promo-subtitle">
                            AccionLabs is an intelligent Applicant Tracking System designed to streamline recruitment and unlock human potential. We help companies find the perfect fit, faster.
                        </p>
                    </div>
                </div>
                <div className="login-form-section">
                    <div className="login-form-content">
                        <h2>Welcome Back!</h2>
                       {error && <div className="login-error">{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <div className="input-wrapper">
                                    <span className="input-icon"><EmailIcon/></span>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <div className="input-wrapper">
                                     <span className="input-icon"><LockIcon/></span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                        <EyeIcon slashed={showPassword} />
                                    </button>
                                </div>
                                <a href="#" className="forgot-password" onClick={() => toast.info('A password reset link has been sent to your email.')}>Forgot Password?</a>
                            </div>
                            <button type="submit" className="btn-signin">Sign In</button>
                        </form>

                        <div className="login-separator">OR</div>

                        <div className="social-login-buttons">
                            <button className="btn-social" onClick={() => toast.info('Initiating Google login...')}><GoogleIcon /> Continue with Google</button>
                            <button className="btn-social" onClick={() => toast.info('Initiating Apple login...')}><AppleIcon /> Continue with Apple</button>
                            <button className="btn-social" onClick={() => toast.info('Initiating Microsoft login...')}><MicrosoftIcon /> Continue with Microsoft</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
