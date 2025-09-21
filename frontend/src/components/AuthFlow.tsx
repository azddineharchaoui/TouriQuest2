import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import api from '../api';
import { tokenManager } from '../utils/tokenManager';
import { 
  ArrowRight, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Shield, 
  Mail,
  Smartphone,
  Lock,
  Check,
  X,
  Mountain,
  Utensils,
  Camera,
  Heart,
  DollarSign,
  Bell,
  MapPin,
  Leaf,
  QrCode,
  Download,
  Printer,
  Copy,
  CheckCircle,
  AlertCircle,
  Fingerprint,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

type AuthStep = 'login' | 'signup' | 'forgot' | 'forgot-confirm' | 'forgot-reset' | 'forgot-success' | 'verify' | 'onboarding' | '2fa-setup' | '2fa-verify' | '2fa-backup';
type OnboardingStep = 1 | 2 | 3 | 4;

interface AuthFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

export function AuthFlow({ onComplete, onBack }: AuthFlowProps) {
  const [step, setStep] = useState<AuthStep>('signup');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form data states
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    termsAccepted: false,
    marketingConsent: false
  });
  
  const [resetPasswordData, setResetPasswordData] = useState({
    email: '',
    token: '',
    password: '',
    confirmPassword: ''
  });
  
  const [twoFactorData, setTwoFactorData] = useState({
    code: '',
    backupCode: '',
    secret: '',
    qrCode: '',
    backupCodes: []
  });
  
  const [oauthData, setOauthData] = useState({
    provider: '',
    accessToken: '',
    idToken: ''
  });
  
  // Previous state variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferences, setPreferences] = useState({
    interests: [] as string[],
    budget: '',
    frequency: '',
    ecoConscious: false,
    notifications: {
      deals: true,
      updates: false,
      social: true
    }
  });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [backupCodes] = useState([
    'A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2', 'M3N4O5P6',
    'Q7R8S9T0', 'U1V2W3X4', 'Y5Z6A7B8', 'C9D0E1F2'
  ]);

  // Password strength validation
  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  // Authentication handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.auth.login({
        email: loginData.email,
        password: loginData.password,
        rememberMe: loginData.rememberMe
      });
      
      if (response.success) {
        // Store tokens and user data using token manager
        tokenManager.setToken({
          accessToken: response.data.tokens.accessToken,
          refreshToken: response.data.tokens.refreshToken,
          expiresAt: Date.now() + (response.data.tokens.expiresIn * 1000),
          tokenType: response.data.tokens.tokenType || 'Bearer'
        }, {
          id: response.data.user.id,
          email: response.data.user.email,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          phoneNumber: response.data.user.phoneNumber,
          avatar: response.data.user.avatar,
          isEmailVerified: response.data.user.isVerified,
          isTwoFactorEnabled: response.data.user.twoFactorEnabled,
          role: response.data.user.role,
          preferences: {
            language: response.data.user.preferredLanguage,
            currency: response.data.user.preferredCurrency,
            notifications: response.data.user.preferences.notifications
          }
        });
        
        setSuccess('Login successful! Redirecting...');
        
        // Check if user needs to complete onboarding
        const profile = await api.auth.getProfile();
        if (profile.success && !profile.data.onboardingCompleted) {
          setStep('onboarding');
        } else if (profile.data.twoFactorEnabled) {
          setStep('2fa-verify');
        } else {
          setTimeout(() => onComplete(), 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate form
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (!signupData.termsAccepted) {
      setError('Please accept the terms and conditions');
      setLoading(false);
      return;
    }
    
    const passwordStrength = getPasswordStrength(signupData.password);
    if (passwordStrength < 2) {
      setError('Password is too weak. Please use a stronger password.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.auth.register({
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        password: signupData.password,
        dateOfBirth: signupData.dateOfBirth,
        termsAccepted: signupData.termsAccepted,
        marketingConsent: signupData.marketingConsent
      });
      
      if (response.success) {
        setSuccess('Account created successfully! Please verify your email.');
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.auth.forgotPassword({
        email: resetPasswordData.email
      });
      
      if (response.success) {
        setSuccess('Password reset instructions sent to your email!');
        setStep('forgot-confirm');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    const passwordStrength = getPasswordStrength(resetPasswordData.password);
    if (passwordStrength < 2) {
      setError('Password is too weak. Please use a stronger password.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.auth.resetPassword({
        token: resetPasswordData.token,
        password: resetPasswordData.password,
        confirmPassword: resetPasswordData.confirmPassword
      });
      
      if (response.success) {
        setSuccess('Password reset successfully!');
        setStep('forgot-success');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerification = async () => {
    setLoading(true);
    setError(null);
    
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete verification code');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.auth.verifyEmail({
        token: code
      });
      
      if (response.success) {
        setSuccess('Email verified successfully!');
        setStep('onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.auth.resendVerification({
        email: loginData.email || signupData.email
      });
      
      if (response.success) {
        setSuccess('Verification code sent!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, you would initiate OAuth flow here
      // For now, we'll simulate the OAuth callback
      const response = await api.auth.oauthLogin(provider, {
        provider: provider,
        accessToken: oauthData.accessToken,
        idToken: oauthData.idToken
      });
      
      if (response.success) {
        setSuccess(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login successful!`);
        setTimeout(() => onComplete(), 1500);
      }
    } catch (err: any) {
      setError(err.message || `${provider} login failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupTwoFactor = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.auth.setup2FA({
        password: password // Current password for verification
      });
      
      if (response.success) {
        setTwoFactorData({
          ...twoFactorData,
          secret: response.data.secret,
          qrCode: response.data.qrCode,
          backupCodes: response.data.backupCodes
        });
        setSuccess('Two-factor authentication setup initiated!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to setup two-factor authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.auth.verify2FA({
        code: twoFactorData.code,
        password: password
      });
      
      if (response.success) {
        setSuccess('Two-factor authentication verified!');
        setStep('2fa-backup');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.auth.completeOnboarding({
        step: 'preferences',
        data: {
          interests: preferences.interests,
          budget: preferences.budget,
          travelFrequency: preferences.frequency,
          notifications: preferences.notifications
        }
      });
      
      if (response.success) {
        setSuccess('Welcome to TouriQuest! Your profile is complete.');
        setTimeout(() => onComplete(), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    
    try {
      await api.auth.logout();
      // Clear any local state
      setLoginData({ email: '', password: '', rememberMe: false });
      setSignupData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: '',
        termsAccepted: false,
        marketingConsent: false
      });
      setStep('login');
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthColors = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const interests = [
    { id: 'adventure', label: 'Adventure', icon: Mountain },
    { id: 'culture', label: 'Culture & History', icon: Camera },
    { id: 'food', label: 'Food & Dining', icon: Utensils },
    { id: 'relaxation', label: 'Relaxation', icon: Heart },
    { id: 'nature', label: 'Nature & Wildlife', icon: Leaf },
    { id: 'nightlife', label: 'Nightlife', icon: Heart }
  ];

  const budgetRanges = [
    { id: 'budget', label: 'Budget-friendly', range: '$50-100/day', description: 'Great value experiences' },
    { id: 'mid', label: 'Mid-range', range: '$100-250/day', description: 'Comfortable travel' },
    { id: 'luxury', label: 'Luxury', range: '$250+/day', description: 'Premium experiences' }
  ];

  const frequencies = [
    { id: 'occasional', label: 'Occasional', description: '1-2 trips per year' },
    { id: 'regular', label: 'Regular', description: '3-5 trips per year' },
    { id: 'frequent', label: 'Frequent', description: '6+ trips per year' }
  ];

  const renderLogin = () => (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
        <p className="text-muted-foreground">Sign in to your TouriQuest account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={loginData.email}
            onChange={(e) => setLoginData({...loginData, email: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember" 
              checked={loginData.rememberMe}
              onCheckedChange={(checked) => setLoginData({...loginData, rememberMe: !!checked})}
            />
            <Label htmlFor="remember" className="text-sm">Remember me</Label>
          </div>
          <button
            type="button"
            onClick={() => setStep('forgot')}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <Button 
          className="w-full" 
          onClick={handleLogin}
          disabled={loading || !loginData.email || !loginData.password}
          type="submit"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <div className="space-y-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </Button>
          <Button variant="outline" className="w-full">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.098.119.112.223.083.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.747 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>
            </svg>
            Continue with Apple
          </Button>
        </div>

        <Card className="p-4 bg-muted/30 border-dashed">
          <div className="flex items-center space-x-3">
            <Fingerprint className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium text-sm">Biometric Login</div>
              <div className="text-xs text-muted-foreground">Use fingerprint or face ID</div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              Enable
            </Button>
          </div>
        </Card>

        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Secure SSL 256-bit encryption</span>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button onClick={() => setStep('signup')} className="text-primary hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </Card>
  );

  const renderSignup = () => (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Create your account</h2>
        <p className="text-muted-foreground">Join TouriQuest and start exploring</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input 
              id="firstName" 
              placeholder="John" 
              value={signupData.firstName}
              onChange={(e) => setSignupData({...signupData, firstName: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input 
              id="lastName" 
              placeholder="Doe" 
              value={signupData.lastName}
              onChange={(e) => setSignupData({...signupData, lastName: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={signupData.email}
              onChange={(e) => setSignupData({...signupData, email: e.target.value})}
              className={signupData.email && !/\S+@\S+\.\S+/.test(signupData.email) ? 'border-destructive' : ''}
            />
            {signupData.email && /\S+@\S+\.\S+/.test(signupData.email) && (
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-success" />
            )}
          </div>
          {signupData.email && !/\S+@\S+\.\S+/.test(signupData.email) && (
            <p className="text-xs text-destructive flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Please enter a valid email address
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={signupData.password}
              onChange={(e) => setSignupData({...signupData, password: e.target.value})}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {signupData.password && (
            <div className="space-y-2">
              <div className="flex space-x-1">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded ${
                      index < getPasswordStrength(signupData.password) ? strengthColors[getPasswordStrength(signupData.password) - 1] : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Password strength: {strengthLabels[getPasswordStrength(signupData.password) - 1] || 'Too weak'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox 
            id="terms" 
            className="mt-1" 
            checked={signupData.termsAccepted}
            onCheckedChange={(checked) => setSignupData({...signupData, termsAccepted: !!checked})}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed">
            I agree to the{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </Label>
        </div>

        <Button 
          className="w-full" 
          onClick={handleSignup}
          disabled={loading || !signupData.email || !signupData.password || !signupData.firstName || !signupData.lastName || getPasswordStrength(signupData.password) < 2}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Connecting...' : 'Sign up with Google'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleOAuthLogin('facebook')}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {loading ? 'Connecting...' : 'Sign up with Facebook'}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button onClick={() => setStep('login')} className="text-primary hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </Card>
  );

  const renderVerify = () => (
    <Card className="w-full max-w-md mx-auto p-8 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail className="w-8 h-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-bold mb-4">Verify your email</h2>
      <p className="text-muted-foreground mb-6">
        We sent a verification code to<br />
        <span className="font-medium">{signupData.email || loginData.email}</span><br />
        Enter the 6-digit code below
      </p>
      
      <div className="flex justify-center space-x-2 mb-6">
        {verificationCode.map((digit, index) => (
          <Input
            key={index}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => {
              const newCode = [...verificationCode];
              newCode[index] = e.target.value;
              setVerificationCode(newCode);
              
              // Auto-focus next input
              if (e.target.value && index < 5) {
                const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                nextInput?.focus();
              }
            }}
            onKeyDown={(e) => {
              // Auto-focus previous input on backspace
              if (e.key === 'Backspace' && !digit && index > 0) {
                const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                prevInput?.focus();
              }
            }}
            data-index={index}
            className="w-12 h-12 text-center text-lg font-mono"
          />
        ))}
      </div>
      
      <Button 
        className="w-full mb-4" 
        onClick={handleEmailVerification}
        disabled={loading || verificationCode.some(digit => !digit)}
      >
        {loading ? 'Verifying...' : 'Verify Email'}
      </Button>
      
      <p className="text-sm text-muted-foreground mb-4">
        Didn't receive the email? Check your spam folder or
      </p>
      
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleResendVerification}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {loading ? 'Sending...' : 'Resend verification email'}
        </Button>
        
        <Button variant="ghost" className="w-full text-xs">
          Change email address
        </Button>
      </div>

      <div className="mt-6 pt-6 border-t">
        <p className="text-xs text-muted-foreground">
          Need help? Contact our{' '}
          <a href="#" className="text-primary hover:underline">support team</a>
        </p>
      </div>
    </Card>
  );

  const renderOnboarding = () => {
    switch (onboardingStep) {
      case 1:
        return (
          <Card className="w-full max-w-2xl mx-auto p-8">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`w-3 h-3 rounded-full ${
                        step <= onboardingStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  Skip
                </button>
              </div>
              
              <h2 className="text-2xl font-bold mb-4">What interests you most?</h2>
              <p className="text-muted-foreground">
                Select your travel preferences to get personalized recommendations
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {interests.map((interest) => {
                const Icon = interest.icon;
                const isSelected = preferences.interests.includes(interest.id);
                
                return (
                  <button
                    key={interest.id}
                    onClick={() => {
                      const newInterests = isSelected
                        ? preferences.interests.filter(i => i !== interest.id)
                        : [...preferences.interests, interest.id];
                      setPreferences({ ...preferences, interests: newInterests });
                    }}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mx-auto mb-3 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div className={`font-medium ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>
                      {interest.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => setOnboardingStep(2)}
                disabled={preferences.interests.length === 0}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        );

      case 2:
        return (
          <Card className="w-full max-w-2xl mx-auto p-8">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`w-3 h-3 rounded-full ${
                        step <= onboardingStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  Skip
                </button>
              </div>
              
              <h2 className="text-2xl font-bold mb-4">Travel budget & frequency</h2>
              <p className="text-muted-foreground">
                Help us suggest options that fit your travel style
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="font-semibold mb-4">What's your typical budget?</h3>
                <div className="space-y-3">
                  {budgetRanges.map((budget) => (
                    <button
                      key={budget.id}
                      onClick={() => setPreferences({ ...preferences, budget: budget.id })}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        preferences.budget === budget.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{budget.label}</div>
                          <div className="text-sm text-muted-foreground">{budget.description}</div>
                        </div>
                        <div className="font-semibold text-primary">{budget.range}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">How often do you travel?</h3>
                <div className="space-y-3">
                  {frequencies.map((freq) => (
                    <button
                      key={freq.id}
                      onClick={() => setPreferences({ ...preferences, frequency: freq.id })}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        preferences.frequency === freq.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{freq.label}</div>
                      <div className="text-sm text-muted-foreground">{freq.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setOnboardingStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => setOnboardingStep(3)}
                disabled={!preferences.budget || !preferences.frequency}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        );

      case 3:
        return (
          <Card className="w-full max-w-2xl mx-auto p-8">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`w-3 h-3 rounded-full ${
                        step <= onboardingStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  Skip
                </button>
              </div>
              
              <h2 className="text-2xl font-bold mb-4">Sustainable travel preferences</h2>
              <p className="text-muted-foreground">
                Help us promote eco-friendly travel options for you
              </p>
            </div>

            <div className="space-y-6">
              <Card className="p-6 border-2 border-dashed border-border">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Eco-conscious traveler</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Prioritize sustainable accommodations, carbon-neutral transportation, and eco-friendly activities
                    </p>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="ecoConscious"
                        checked={preferences.ecoConscious}
                        onCheckedChange={(checked) => 
                          setPreferences({ ...preferences, ecoConscious: !!checked })
                        }
                      />
                      <Label htmlFor="ecoConscious">
                        Yes, I want to travel sustainably
                      </Label>
                    </div>
                  </div>
                </div>
              </Card>

              {preferences.ecoConscious && (
                <div className="space-y-4 p-6 bg-success/5 rounded-lg border border-success/20">
                  <h4 className="font-medium text-success">Great! You'll get access to:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-sm">Carbon footprint tracking for your trips</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-sm">Eco-certified accommodations and experiences</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-sm">Carbon offset program integration</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-sm">Sustainability achievement badges</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setOnboardingStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setOnboardingStep(4)}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        );

      case 4:
        return (
          <Card className="w-full max-w-2xl mx-auto p-8">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`w-3 h-3 rounded-full ${
                        step <= onboardingStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-4">Notification preferences</h2>
              <p className="text-muted-foreground">
                Choose what updates you'd like to receive from TouriQuest
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">Travel deals & offers</div>
                      <div className="text-sm text-muted-foreground">
                        Get notified about special prices and promotions
                      </div>
                    </div>
                  </div>
                  <Checkbox 
                    checked={preferences.notifications.deals}
                    onCheckedChange={(checked) => 
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, deals: !!checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-secondary" />
                    <div>
                      <div className="font-medium">Trip updates & reminders</div>
                      <div className="text-sm text-muted-foreground">
                        Check-in reminders, itinerary changes, and travel tips
                      </div>
                    </div>
                  </div>
                  <Checkbox 
                    checked={preferences.notifications.updates}
                    onCheckedChange={(checked) => 
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, updates: !!checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Heart className="w-5 h-5 text-accent" />
                    <div>
                      <div className="font-medium">Social & community</div>
                      <div className="text-sm text-muted-foreground">
                        Friend requests, travel buddy matches, and community updates
                      </div>
                    </div>
                  </div>
                  <Checkbox 
                    checked={preferences.notifications.social}
                    onCheckedChange={(checked) => 
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, social: !!checked }
                      })
                    }
                  />
                </div>
              </div>

              <Card className="p-4 bg-muted/30">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium">Location access</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Allow location access for personalized recommendations and nearby attractions
                    </div>
                    <Button variant="outline" size="sm">
                      Enable location services
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setOnboardingStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleCompleteOnboarding} 
                className="bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? 'Completing...' : 'Complete Setup'}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        );
    }
  };

  const renderForgotPassword = () => (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Reset your password</h2>
        <p className="text-muted-foreground">
          Enter your email and we'll send you reset instructions
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="resetEmail">Email address</Label>
          <Input
            id="resetEmail"
            type="email"
            placeholder="Enter your email"
            value={resetPasswordData.email}
            onChange={(e) => setResetPasswordData({...resetPasswordData, email: e.target.value})}
          />
        </div>

        <Button 
          className="w-full" 
          onClick={handleForgotPassword}
          disabled={loading || !resetPasswordData.email}
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <button onClick={() => setStep('login')} className="text-primary hover:underline">
            Back to sign in
          </button>
        </p>
      </div>
    </Card>
  );

  const renderForgotConfirm = () => (
    <Card className="w-full max-w-md mx-auto p-8 text-center">
      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      
      <h2 className="text-2xl font-bold mb-4">Check your email</h2>
      <p className="text-muted-foreground mb-6">
        We sent password reset instructions to<br />
        <span className="font-medium">{resetEmail}</span>
      </p>
      
      <Button className="w-full mb-4" onClick={() => setStep('forgot-reset')}>
        I received the email
      </Button>
      
      <p className="text-sm text-muted-foreground mb-4">
        Didn't receive it? Check your spam folder or
      </p>
      
      <Button variant="outline" className="w-full">
        <RefreshCw className="w-4 h-4 mr-2" />
        Resend email
      </Button>
    </Card>
  );

  const renderForgotReset = () => (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Create new password</h2>
        <p className="text-muted-foreground">
          Your new password must be different from previous passwords
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={resetPasswordData.password}
              onChange={(e) => setResetPasswordData({...resetPasswordData, password: e.target.value})}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {resetPasswordData.password && (
            <div className="space-y-2">
              <div className="flex space-x-1">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded ${
                      index < getPasswordStrength(resetPasswordData.password) ? strengthColors[getPasswordStrength(resetPasswordData.password) - 1] : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Password strength: {strengthLabels[getPasswordStrength(resetPasswordData.password) - 1] || 'Too weak'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={resetPasswordData.confirmPassword}
            onChange={(e) => setResetPasswordData({...resetPasswordData, confirmPassword: e.target.value})}
          />
          {resetPasswordData.confirmPassword && resetPasswordData.password !== resetPasswordData.confirmPassword && (
            <p className="text-xs text-destructive flex items-center">
              <X className="w-3 h-3 mr-1" />
              Passwords don't match
            </p>
          )}
        </div>

        <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium">Password requirements:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Check className={`w-3 h-3 ${resetPasswordData.password.length >= 8 ? 'text-success' : 'text-muted-foreground'}`} />
              <span>At least 8 characters</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className={`w-3 h-3 ${/[A-Z]/.test(resetPasswordData.password) ? 'text-success' : 'text-muted-foreground'}`} />
              <span>One uppercase letter</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className={`w-3 h-3 ${/[0-9]/.test(resetPasswordData.password) ? 'text-success' : 'text-muted-foreground'}`} />
              <span>One number</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className={`w-3 h-3 ${/[^A-Za-z0-9]/.test(resetPasswordData.password) ? 'text-success' : 'text-muted-foreground'}`} />
              <span>One special character</span>
            </div>
          </div>
        </div>

        <Button 
          className="w-full" 
          onClick={handleResetPassword}
          disabled={loading || !resetPasswordData.password || !resetPasswordData.confirmPassword || resetPasswordData.password !== resetPasswordData.confirmPassword || getPasswordStrength(resetPasswordData.password) < 3}
        >
          {loading ? 'Updating...' : 'Update password'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <button onClick={() => setStep('login')} className="text-primary hover:underline">
            Back to sign in
          </button>
        </p>
      </div>
    </Card>
  );

  const renderForgotSuccess = () => (
    <Card className="w-full max-w-md mx-auto p-8 text-center">
      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      
      <h2 className="text-2xl font-bold mb-4">Password updated!</h2>
      <p className="text-muted-foreground mb-8">
        Your password has been successfully updated. You can now sign in with your new password.
      </p>
      
      <Button className="w-full" onClick={() => setStep('login')}>
        Continue to login
      </Button>
    </Card>
  );

  const render2FASetup = () => (
    <Card className="w-full max-w-lg mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Secure your account</h2>
        <p className="text-muted-foreground">
          Two-factor authentication adds an extra layer of security to your account
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <Card className="p-4">
            <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
            <h4 className="font-medium text-sm">Enhanced Security</h4>
          </Card>
          <Card className="p-4">
            <Lock className="w-8 h-8 text-success mx-auto mb-2" />
            <h4 className="font-medium text-sm">Account Protection</h4>
          </Card>
          <Card className="p-4">
            <Smartphone className="w-8 h-8 text-accent mx-auto mb-2" />
            <h4 className="font-medium text-sm">Mobile Verified</h4>
          </Card>
        </div>

        <div className="text-center">
          <h3 className="font-semibold mb-4">Scan this QR code</h3>
          <div className="bg-white p-6 rounded-lg border-2 border-dashed inline-block">
            <QrCode className="w-32 h-32 text-muted-foreground mx-auto" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Use Google Authenticator, Authy, or any compatible app
          </p>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full">
            <Copy className="w-4 h-4 mr-2" />
            Manual entry: ABCD-EFGH-IJKL-MNOP
          </Button>
          
          <Button className="w-full" onClick={() => setStep('2fa-verify')}>
            I've added this to my authenticator
          </Button>
          
          <Button variant="ghost" className="w-full" onClick={() => setStep('verify')}>
            Skip for now
          </Button>
        </div>
      </div>
    </Card>
  );

  const render2FAVerify = () => (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Enter verification code</h2>
        <p className="text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-center space-x-2">
          {verificationCode.map((digit, index) => (
            <Input
              key={index}
              type="text"
              maxLength={1}
              className="w-12 h-12 text-center text-lg font-semibold"
              value={digit}
              onChange={(e) => {
                const newCode = [...verificationCode];
                newCode[index] = e.target.value;
                setVerificationCode(newCode);
                setTwoFactorData({...twoFactorData, code: newCode.join('')});
                
                // Auto-focus next input
                if (e.target.value && index < 5) {
                  const nextInput = e.target.parentElement?.nextElementSibling?.querySelector('input');
                  nextInput?.focus();
                }
              }}
            />
          ))}
        </div>

        <Button 
          className="w-full" 
          onClick={handleVerifyTwoFactor}
          disabled={loading || verificationCode.some(digit => !digit)}
        >
          {loading ? 'Verifying...' : 'Verify code'}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?
          </p>
          <Button variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Resend code
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="trustDevice" />
          <Label htmlFor="trustDevice" className="text-sm">
            Trust this device for 30 days
          </Label>
        </div>
      </div>
    </Card>
  );

  const render2FABackup = () => (
    <Card className="w-full max-w-lg mx-auto p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Save your backup codes</h2>
        <p className="text-muted-foreground">
          Keep these codes safe - you can use them to access your account if you lose your device
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            {backupCodes.map((code, index) => (
              <div key={index} className="p-3 bg-background rounded border font-mono text-center">
                {code}
              </div>
            ))}
          </div>
        </Card>

        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <h4 className="font-medium text-warning">Keep these codes secure</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Store them in a password manager</li>
                <li>• Print and keep in a safe place</li>
                <li>• Don't share them with anyone</li>
                <li>• Each code can only be used once</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox id="savedCodes" className="mt-1" />
          <Label htmlFor="savedCodes" className="text-sm leading-relaxed">
            I have saved these backup codes in a secure location
          </Label>
        </div>

        <Button className="w-full" onClick={() => setStep('onboarding')}>
          Continue to setup
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      {step === 'login' && renderLogin()}
      {step === 'signup' && renderSignup()}
      {step === 'forgot' && renderForgotPassword()}
      {step === 'forgot-confirm' && renderForgotConfirm()}
      {step === 'forgot-reset' && renderForgotReset()}
      {step === 'forgot-success' && renderForgotSuccess()}
      {step === 'verify' && renderVerify()}
      {step === '2fa-setup' && render2FASetup()}
      {step === '2fa-verify' && render2FAVerify()}
      {step === '2fa-backup' && render2FABackup()}
      {step === 'onboarding' && renderOnboarding()}
    </div>
  );
}