import React, { useState } from 'react';
import { authAPI, organizationAPI } from '../utils/api';

const SignUpSection = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    organizationId: '',
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [orgInfo, setOrgInfo] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const verifyOrganizationId = async () => {
    if (!formData.organizationId.trim()) {
      setErrors({ organizationId: 'Organization ID is required' });
      return false;
    }

    const orgId = formData.organizationId.trim();
    if (!orgId.startsWith('ORG-') || orgId.length !== 16) {
      setErrors({ organizationId: 'Invalid Organization ID format' });
      return false;
    }

    setVerifying(true);
    try {
      const response = await organizationAPI.verify(orgId);
      if (response.data.valid) {
        setOrgInfo(response.data.organization);
        setErrors({});
        return true;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Organization not found';
      setErrors({ organizationId: errorMsg });
      setOrgInfo(null);
      return false;
    } finally {
      setVerifying(false);
    }
    return false;
  };

  const validateStep1 = async () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;

    // Verify organization ID
    return await verifyOrganizationId();
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (await validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await authAPI.signup({
        organizationId: formData.organizationId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        password: formData.password
      });

      if (response.data.success) {
        setSuccess(true);

        // Reset form after 3 seconds
        setTimeout(() => {
          setSuccess(false);
          setStep(1);
          setFormData({
            organizationId: '',
            name: '',
            email: '',
            phone: '',
            role: '',
            password: '',
            confirmPassword: ''
          });
          setOrgInfo(null);
        }, 3000);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Signup failed. Please try again.';
      setErrors({ submit: errorMsg });
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="signup" className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Join Your Organization
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-600 to-purple-600 mx-auto mb-6"></div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Already have an Organization ID? Sign up to join your team and start analyzing interviews.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 text-center mb-8 animate-fadeIn">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-900 mb-2">Sign Up Successful!</h3>
              <p className="text-green-700">You can now login with your mobile number and password.</p>
            </div>
          )}

          {/* Sign Up Form */}
          {!success && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">Sign Up</h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      step >= 1 ? 'bg-white text-indigo-600' : 'bg-indigo-400 text-white'
                    }`}>
                      1
                    </div>
                    <div className={`w-12 h-1 ${step >= 2 ? 'bg-white' : 'bg-indigo-400'}`}></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      step >= 2 ? 'bg-white text-indigo-600' : 'bg-indigo-400 text-white'
                    }`}>
                      2
                    </div>
                  </div>
                </div>
                <p className="text-indigo-100 text-sm">
                  {step === 1 ? 'Step 1: Personal Details' : 'Step 2: Set Password'}
                </p>
              </div>

              {/* Form Content */}
              <div className="p-8">
                {step === 1 ? (
                  // Step 1: Personal Details
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization ID <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="organizationId"
                          value={formData.organizationId}
                          onChange={handleChange}
                          className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono ${
                            errors.organizationId ? 'border-red-500' : orgInfo ? 'border-green-500' : 'border-gray-300'
                          }`}
                          placeholder="ORG-XXXXXXXXXXXX"
                        />
                        {orgInfo && (
                          <div className="flex items-center text-green-600">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {errors.organizationId && <p className="text-red-500 text-sm mt-1">{errors.organizationId}</p>}
                      {orgInfo && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>✓ Organization:</strong> {orgInfo.name}
                            <br />
                            <strong>Location:</strong> {orgInfo.location}
                          </p>
                        </div>
                      )}
                      {!orgInfo && (
                        <p className="text-xs text-gray-500 mt-1">
                          Don't have one? Click "Create Organization" in the navbar
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                          errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter your full name"
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="you@example.com"
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="10-digit mobile number"
                        maxLength="10"
                      />
                      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        You'll use this number to login
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                          errors.role ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select your role</option>
                        <option value="hr">HR / Recruiter</option>
                        <option value="interviewer">Interviewer</option>
                        <option value="admin">Admin</option>
                      </select>
                      {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
                    </div>

                    <button
                      onClick={handleNext}
                      disabled={verifying}
                      className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifying ? 'Verifying Organization...' : 'Continue to Password'}
                    </button>
                  </div>
                ) : (
                  // Step 2: Password
                  <div className="space-y-5">
                    <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      Set a password for mobile number: <strong>{formData.phone}</strong>
                    </p>

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
                        placeholder="Enter password (min 6 characters)"
                      />
                      {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Re-enter password"
                      />
                      {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>

                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Your Login Credentials:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>📱 <strong>Mobile:</strong> {formData.phone}</li>
                        <li>🔐 <strong>Password:</strong> The password you're setting</li>
                        <li>🏢 <strong>Organization:</strong> {orgInfo?.name}</li>
                      </ul>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleBack}
                        disabled={loading}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SignUpSection;

