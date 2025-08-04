'use client';

import Link from 'next/link';
import { Menu, X, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detectar scroll para mudar o background do header
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Header responsivo - menor em mobile
      const headerHeight = window.innerWidth < 768 ? 60 : 80;
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleMenuClick = (sectionId: string) => {
    setIsMenuOpen(false);
    scrollToSection(sectionId);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg' 
        : 'bg-transparent'
    }`}>
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className={`text-2xl font-bold font-montserrat transition-colors duration-300 ${
          isScrolled ? 'text-primary' : 'text-white'
        }`}>
          JR Imóveis
        </Link>
        
        <div className="hidden lg:flex items-center space-x-8">
          <a 
            onClick={() => scrollToSection('home')} 
            className={`transition-all duration-300 cursor-pointer px-3 py-2 rounded-md text-lg font-medium ${
              isScrolled 
                ? 'text-gray-700 hover:text-primary' 
                : 'text-white/90 hover:text-white hover:bg-white/20 hover:scale-105 transform'
            }`}
          >
            Início
          </a>
          <a 
            onClick={() => scrollToSection('sobre')} 
            className={`transition-all duration-300 cursor-pointer px-3 py-2 rounded-md text-lg font-medium ${
              isScrolled 
                ? 'text-gray-700 hover:text-primary' 
                : 'text-white/90 hover:text-white hover:bg-white/20 hover:scale-105 transform'
            }`}
          >
            Sobre
          </a>
          <a 
            onClick={() => scrollToSection('services')} 
            className={`transition-all duration-300 cursor-pointer px-3 py-2 rounded-md text-lg font-medium ${
              isScrolled 
                ? 'text-gray-700 hover:text-primary' 
                : 'text-white/90 hover:text-white hover:bg-white/20 hover:scale-105 transform'
            }`}
          >
            Serviços
          </a>
          <a 
            onClick={() => scrollToSection('featured-properties')} 
            className={`transition-all duration-300 cursor-pointer px-3 py-2 rounded-md text-lg font-medium ${
              isScrolled 
                ? 'text-gray-700 hover:text-primary' 
                : 'text-white/90 hover:text-white hover:bg-white/20 hover:scale-105 transform'
            }`}
          >
            Imóveis
          </a>
          <a 
            onClick={() => scrollToSection('contact-section')} 
            className={`transition-all duration-300 cursor-pointer px-3 py-2 rounded-md text-lg font-medium ${
              isScrolled 
                ? 'text-gray-700 hover:text-primary' 
                : 'text-white/90 hover:text-white hover:bg-white/20 hover:scale-105 transform'
            }`}
          >
            Contato
          </a>
        </div>
        
        <a 
          href="https://wa.me/5518997398482" 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`hidden lg:flex items-center font-bold py-2 px-4 rounded-lg transition-all duration-300 ${
            isScrolled 
              ? 'bg-accent text-white hover:opacity-90' 
              : 'bg-white/20 text-white hover:bg-white/40 hover:scale-105 transform backdrop-blur-sm'
          }`}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          WhatsApp
        </a>
        
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className={`lg:hidden transition-colors duration-300 ${
            isScrolled ? 'text-primary' : 'text-white'
          }`}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>
      
      {isMenuOpen && (
        <div className={`lg:hidden py-4 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md' : 'bg-black/80 backdrop-blur-md'
        }`}>
          <a 
            onClick={() => handleMenuClick('home')} 
            className={`block text-center py-2 cursor-pointer transition-colors duration-300 ${
              isScrolled 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            Início
          </a>
          <a 
            onClick={() => handleMenuClick('sobre')} 
            className={`block text-center py-2 cursor-pointer transition-colors duration-300 ${
              isScrolled 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            Sobre
          </a>
          <a 
            onClick={() => handleMenuClick('services')} 
            className={`block text-center py-2 cursor-pointer transition-colors duration-300 ${
              isScrolled 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            Serviços
          </a>
          <a 
            onClick={() => handleMenuClick('featured-properties')} 
            className={`block text-center py-2 cursor-pointer transition-colors duration-300 ${
              isScrolled 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            Imóveis
          </a>
          <a 
            onClick={() => handleMenuClick('contact-section')} 
            className={`block text-center py-2 cursor-pointer transition-colors duration-300 ${
              isScrolled 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            Contato
          </a>
          <div className="mt-4 px-6">
            <a 
              href="https://wa.me/5518997398482" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`block w-full text-center font-bold py-2 px-6 rounded-lg transition-all duration-300 flex items-center justify-center ${
                isScrolled 
                  ? 'bg-accent text-white hover:opacity-90' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;