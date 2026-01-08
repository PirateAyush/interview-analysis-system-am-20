import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

const LoginModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
  const [formData, setFormData] = useState({
    mobile: '',
    password: ''
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [emailHint, setEmailHint] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const validateCredentials = () => {
    const newErrors = {};
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile must be 10 digits';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateCredentials()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await authAPI.login({
        mobile: formData.mobile,
        password: formData.password
      });

      if (response.data.success) {
        setEmailHint(response.data.email_hint);
        setStep(2);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Login failed. Please try again.';
      setErrors({ submit: errorMsg });
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
	const enteredOtp = otp.join('');
  
  if (enteredOtp.length !== 6) {
    setErrors({ otp: 'Please enter complete OTP' });
    return;
  }

  setLoading(true);
  setErrors({});
  
  try {
    const response = await authAPI.verifyOTP({
      mobile: formData.mobile,
      otp: enteredOtp
    });

    console.log('✅ OTP Response:', response.data);

    if (response.data.success && response.data.access_token) {
      const token = response.data.access_token;
      const user = response.data.user;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('✅ Token saved to localStorage');
      
      // Close modal and redirect
      handleClose();
      navigate('/dashboard');
    } else {
      setErrors({ otp: 'Invalid response from server' });
    }
  } catch (error) {
    console.error('❌ OTP Error:', error.response?.data || error.message);
    const errorMsg = error.response?.data?.error || 'Invalid OTP. Please try again.';
    setErrors({ otp: errorMsg });
  } finally {
    setLoading(false);
  }  
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setErrors({});

    try {
      const response = await authAPI.resendOTP({
        mobile: formData.mobile
      });

      if (response.data.success) {
        setOtp(['', '', '', '', '', '']);
        alert('OTP resent successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({ mobile: '', password: '' });
    setOtp(['', '', '', '', '', '']);
    setErrors({});
    setEmailHint('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              {step === 1 ? 'Login' : 'Verify OTP'}
            </h2>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            // Step 1: Credentials
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                    errors.mobile ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="10-digit mobile number"
                  maxLength="10"
                />
                {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 After login, you'll receive an OTP on your registered email for verification.
                </p>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue to OTP'}
              </button>

              <div className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <button onClick={handleClose} className="text-indigo-600 font-semibold hover:underline">
                  Sign up below
                </button>
              </div>
            </div>
          ) : (
            // Step 2: OTP Verification
            <div className="space-y-4">
              <p className="text-center text-gray-600 mb-2">
                Enter the 6-digit OTP sent to
              </p>
              <p className="text-center font-semibold text-indigo-600 mb-6">
                {emailHint}
              </p>

              <div className="flex justify-center gap-2 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                ))}
              </div>

              {errors.otp && (
                <p className="text-red-500 text-sm text-center">{errors.otp}</p>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <div className="text-center">
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-indigo-600 font-semibold hover:underline text-sm disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>

              <button
                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setErrors({}); }}
                className="w-full px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

