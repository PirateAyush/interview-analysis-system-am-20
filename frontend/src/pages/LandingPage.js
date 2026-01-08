import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import About from '../components/About';
import SignUpSection from '../components/SignUpSection';
import ContactUs from '../components/ContactUs';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import OrganizationModal from '../components/OrganizationModal';

const LandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Navbar 
        onLoginClick={() => setShowLoginModal(true)}
        onCreateOrgClick={() => setShowOrgModal(true)}
      />
      <Hero />
      <About />
      <SignUpSection />
      <ContactUs />
      <Footer />

      {/* Modals */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
      <OrganizationModal 
        isOpen={showOrgModal} 
        onClose={() => setShowOrgModal(false)} 
      />
    </div>
  );
};

export default LandingPage;
