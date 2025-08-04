'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import {
  BedDouble, Bath, Ruler,
  Gem, Eye, HeartHandshake, Phone, Mail, MapPin, Clock,
  MessageCircle, Home as HomeIcon,
  Handshake, DollarSign, Lightbulb
} from 'lucide-react';
import Pagination from '../components/Pagination';
import {
  getPublicCidades,
  getPublicImoveis,
  getPublicImoveisDestaque,
  PublicImovel,
  PublicCidade
} from '@/lib/api/public';

// Componente Map para lidar com o carregamento do iframe
const MapComponent = () => {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Intersection Observer para carregar o mapa apenas quando visível
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setMapLoaded(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      observer.observe(mapContainer);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div id="map-container" className="w-full h-[300px] bg-gray-200 rounded-lg flex items-center justify-center">
      {!mapLoaded ? (
        <p className="text-gray-500">Carregando mapa...</p>
      ) : (
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29474.73924614988!2d-51.55496978437499!3d-22.27089639999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9493f5b1e5c3f8e5%3A0xc0e89f0a6a0f0f0f!2sRegente%20Feij%C3%B3%2C%20SP%2C%20Brasil!5e0!3m2!1spt-BR!2sbr!4v1678886512345!5m2!1spt-BR!2sbr"
          width="100%"
          height="300"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Localização JR Imóveis"
          className="rounded-lg"
          sandbox="allow-scripts allow-same-origin allow-forms"
        ></iframe>
      )}
    </div>
  );
};



const services = [
  { icon: <HomeIcon size={48} className="text-accent" />, title: 'Compra de Imóveis', description: 'Encontre o imóvel ideal para você e sua família com a nossa consultoria especializada.' },
  { icon: <DollarSign size={48} className="text-accent" />, title: 'Venda de Imóveis', description: 'Anuncie seu imóvel conosco e alcance uma vasta rede de potenciais compradores.' },
  { icon: <Handshake size={48} className="text-accent" />, title: 'Aluguel de Imóveis', description: 'Oferecemos opções de aluguel para residências e comércios, com segurança e agilidade.' },
  { icon: <Lightbulb size={48} className="text-accent" />, title: 'Consultoria Imobiliária', description: 'Conte com nossos especialistas para tomar as melhores decisões no mercado imobiliário.' },
];



interface ContactFormInputs {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const Home = () => {
  // Real data state
  const [cidades, setCidades] = useState<PublicCidade[]>([]);
  const [imoveis, setImoveis] = useState<PublicImovel[]>([]);
  const [imoveisDestaque, setImoveisDestaque] = useState<PublicImovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingImoveis, setLoadingImoveis] = useState(false);

  // Filter state
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PublicImovel | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 8;

  // Hero background carousel state
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [isClient, setIsClient] = useState(false);



  // Contact form setup
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormInputs>();

  // Property types from database
  const propertyTypes = [
    'Apartamento',
    'Casa',
    'Chácara',
    'Fazenda',
    'Sítio',
    'Terreno',
  ].sort();

  // Load initial data (runs once on mount)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Load cities and featured properties in parallel
        const [cidadesData, imoveisDestaqueData] = await Promise.all([
          getPublicCidades(),
          getPublicImoveisDestaque({ limit: 6 })
        ]);

        setCidades(cidadesData);
        setImoveisDestaque(imoveisDestaqueData);

        // Load initial properties
        try {
          setLoadingImoveis(true);
          const response = await getPublicImoveis({
            page: 1,
            limit: itemsPerPage,
            tipo: undefined,
            cidade_id: undefined,
            search: undefined
          });

          // Combine featured properties with regular properties, removing duplicates
          const featuredIds = new Set(imoveisDestaqueData.map(imovel => imovel.id));
          const regularImoveis = response.data.filter(imovel => !featuredIds.has(imovel.id));
          const allImoveis = [...imoveisDestaqueData, ...regularImoveis];
          setImoveis(allImoveis);
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.total);
          setCurrentPage(1);
        } catch (error) {
          console.error('Erro ao carregar imóveis iniciais:', error);
          setImoveis([]);
        } finally {
          setLoadingImoveis(false);
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Empty dependency array - runs only once on mount

  // Load properties when filters or page changes
  useEffect(() => {
    if (loading) return; // Não executar durante carregamento inicial

    const loadProperties = async () => {
      try {
        setLoadingImoveis(true);
        const response = await getPublicImoveis({
          page: currentPage,
          limit: itemsPerPage,
          tipo: selectedType || undefined,
          cidade_id: selectedCity || undefined,
          search: searchTerm || undefined
        });

        setImoveis(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } catch (error) {
        console.error('Erro ao carregar imóveis:', error);
        setImoveis([]);
      } finally {
        setLoadingImoveis(false);
      }
    };

    loadProperties();
  }, [selectedType, selectedCity, searchTerm, currentPage]);



  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-rotate hero background every 8 seconds (only on client)
  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % 4);
    }, 8000); // 8 seconds

    return () => clearInterval(interval);
  }, [isClient]);

  // Hero background images for different property types
  const heroImages = [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&h=1080&fit=crop', // Casa
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&h=1080&fit=crop', // Apartamento
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&h=1080&fit=crop', // Fazenda/Terreno
    'https://images.unsplash.com/photo-1726592058743-384b550930a6?w=1920&h=1080&fit=crop', // Terreno em Desenvolvimento
  ];

  // Máscara de telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    e.target.value = formatted;
  };

  // Parallax effect with requestAnimationFrame for better performance
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          const parallax = document.querySelector('.parallax-bg') as HTMLElement;
          if (parallax) {
            // Velocidade mais suave para a imagem de casa luxuosa
            const speed = scrolled * 0.3;
            parallax.style.transform = `translateY(${speed}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Função para scroll responsivo
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

  const onSubmit: SubmitHandler<ContactFormInputs> = (data) => {
    alert('Mensagem enviada com sucesso!');
    reset(); // Clear form after submission
  };

  const handleCityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const city = event.target.value;
    setSelectedCity(city);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filters are automatically applied through useEffect
    scrollToSection('all-properties-section');
  };

  const clearFilters = () => {
    setSelectedCity('');
    setSelectedType('');
    setSearchTerm('');
    setCurrentPage(1);
    scrollToSection('all-properties-section');
  };

  const openPropertyModal = (property: PublicImovel) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const closePropertyModal = () => {
    setIsModalOpen(false);
    setSelectedProperty(null);
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage('');
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    scrollToSection('all-properties-section');
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      scrollToSection('all-properties-section');
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      scrollToSection('all-properties-section');
    }
  };

  // Format price for display
  const formatPrice = (price?: number) => {
    if (!price) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get property price display (only the value)
  const getPropertyPrice = (imovel: PublicImovel) => {
    if (imovel.finalidade === 'venda' && imovel.valor_venda) {
      return formatPrice(imovel.valor_venda);
    }
    if (imovel.finalidade === 'aluguel' && imovel.valor_aluguel) {
      return `${formatPrice(imovel.valor_aluguel)}/mês`;
    }
    if (imovel.finalidade === 'ambos') {
      const venda = imovel.valor_venda ? formatPrice(imovel.valor_venda) : '';
      const aluguel = imovel.valor_aluguel ? `${formatPrice(imovel.valor_aluguel)}/mês` : '';
      return [venda, aluguel].filter(Boolean).join(' | ');
    }
    return 'Consulte';
  };

  // Get property price components for layout
  const getPropertyPriceComponents = (imovel: PublicImovel) => {
    const components = [];
    
    if (imovel.finalidade === 'venda' && imovel.valor_venda) {
      components.push({
        type: 'venda',
        value: formatPrice(imovel.valor_venda),
        badge: 'Venda'
      });
    }
    
    if (imovel.finalidade === 'aluguel' && imovel.valor_aluguel) {
      components.push({
        type: 'aluguel',
        value: `${formatPrice(imovel.valor_aluguel)}/mês`,
        badge: 'Aluguel'
      });
    }
    
    if (imovel.finalidade === 'ambos') {
      if (imovel.valor_venda) {
        components.push({
          type: 'venda',
          value: formatPrice(imovel.valor_venda),
          badge: 'Venda'
        });
      }
      if (imovel.valor_aluguel) {
        components.push({
          type: 'aluguel',
          value: `${formatPrice(imovel.valor_aluguel)}/mês`,
          badge: 'Aluguel'
        });
      }
    }
    
    return components;
  };

  // Get property badges for venda/aluguel
  const getPropertyBadges = (imovel: PublicImovel) => {
    const badges = [];
    
    if (imovel.finalidade === 'venda' && imovel.valor_venda) {
      badges.push(
        <span key="venda" className="inline-block bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md mr-2">
          Venda
        </span>
      );
    }
    
    if (imovel.finalidade === 'aluguel' && imovel.valor_aluguel) {
      badges.push(
        <span key="aluguel" className="inline-block bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-md mr-2">
          Aluguel
        </span>
      );
    }
    
    if (imovel.finalidade === 'ambos') {
      if (imovel.valor_venda) {
        badges.push(
          <span key="venda" className="inline-block bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md mr-2">
            Venda
          </span>
        );
      }
      if (imovel.valor_aluguel) {
        badges.push(
          <span key="aluguel" className="inline-block bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-md mr-2">
            Aluguel
          </span>
        );
      }
    }
    
    return badges;
  };

  return (
    <div>
      {/* Hero Section */}
      <section id="home" className="relative h-[85vh] min-h-[600px] md:min-h-[500px] overflow-hidden text-white">
        {/* Parallax Background */}
        <div
          className="parallax-bg absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroImages[currentHeroSlide]})`,
            transform: 'translateY(0px)'
          }}
        ></div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60"></div>

        {/* Hero carousel indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentHeroSlide(i)}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${i === currentHeroSlide ? 'bg-white' : 'bg-white/50'
                }`}
              aria-label={`Ir para imagem ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 h-full flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-montserrat leading-tight">Encontre o Imóvel dos Seus Sonhos</h1>
          <p className="mt-4 text-xl text-gray-200">O caminho para o seu novo lar.</p>
          <div className="mt-8 mb-8 bg-white bg-opacity-90 p-6 rounded-lg shadow-2xl w-full max-w-5xl mx-auto">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-left text-gray-800 col-span-full md:col-span-1">
                <label className="font-semibold text-sm">Operação</label>
                <select className="w-full mt-1 py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent">
                  <option>Comprar</option>
                  <option>Alugar</option>
                </select>
              </div>
              <div className="text-left text-gray-800 col-span-full md:col-span-1">
                <label className="font-semibold text-sm">Tipo de Imóvel</label>
                <select className="w-full mt-1 py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  <option value="">Todos</option>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="text-left text-gray-800 col-span-full md:col-span-1">
                <label className="font-semibold text-sm">Cidade</label>
                <select className="w-full mt-1 py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" onChange={handleCityChange} value={selectedCity}>
                  <option value="">Selecione a Cidade</option>
                  {cidades.map((cidade) => (
                    <option key={cidade.id} value={cidade.id}>{cidade.nome}</option>
                  ))}
                </select>
              </div>
              <div className="text-left text-gray-800 col-span-full md:col-span-1 flex flex-col justify-end">
                <button type="submit" className="w-full bg-accent text-white font-bold py-2 px-3 rounded-md hover:opacity-90 transition duration-300">Buscar</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="sobre" className="py-12 bg-white">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2">
            <Image
              src="/team-bg.jpg"
              alt="Equipe da Imobiliária"
              width={600}
              height={400}
              className="rounded-lg shadow-lg object-cover w-full h-80 md:h-96"
              priority
              unoptimized
            />
          </div>
          <div className="md:w-1/2 text-center md:text-left">
            <div className="mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-2">Bem-vindo à JR Imóveis</h2>
              <div className="w-24 h-1 bg-accent mx-auto md:mx-0 rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-600 leading-relaxed text-justify">
              Há mais de uma década no mercado imobiliário, a JR Imóveis se destaca pela excelência, transparência e compromisso com nossos clientes. Especializada em imóveis de alto padrão, oferecemos uma experiência única e personalizada, guiando você em cada etapa da jornada de encontrar o imóvel perfeito ou realizar o melhor negócio da sua vida.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed text-justify">
              Nossa equipe de profissionais experientes e certificados está sempre pronta para atender suas necessidades com dedicação e conhecimento técnico, garantindo que cada transação seja realizada com segurança, agilidade e total satisfação.
            </p>
          </div>
        </div>
        <div className="container mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="bg-accent text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Gem className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-primary mt-3">Missão</h3>
            <p className="mt-2 text-gray-600 text-sm">
              Proporcionar soluções imobiliárias completas e personalizadas, oferecendo consultoria especializada, transparência total e atendimento de excelência. Nosso objetivo é transformar sonhos em realidade, garantindo a melhor experiência para nossos clientes em cada transação.
            </p>
          </div>
          <div>
            <div className="bg-accent text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Eye className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-primary mt-3">Visão</h3>
            <p className="mt-2 text-gray-600 text-sm">
              Ser reconhecida como a imobiliária de referência na região, líder em inovação, confiança e satisfação do cliente. Buscamos constantemente a excelência, expandindo nossa presença e consolidando nossa posição como parceira estratégica no mercado imobiliário.
            </p>
          </div>
          <div>
            <div className="bg-accent text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <HeartHandshake className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-primary mt-3">Valores</h3>
            <p className="mt-2 text-gray-600 text-sm">
              Ética, Transparência, Comprometimento, Inovação, Atendimento Personalizado, Responsabilidade Social e Paixão pelo que fazemos. Estes valores norteiam todas as nossas ações e relacionamentos com clientes, parceiros e colaboradores.
            </p>
          </div>
        </div>
      </section>



      {/* All Properties Section (Filtered by Search) */}
      <section id="all-properties-section" className="py-12 bg-light-gray">
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-2">
              Todos os Imóveis
              {selectedCity && (
                <span className="block md:inline text-accent text-2xl md:text-4xl mt-1 md:mt-0">
                  {cidades.find(c => c.id === selectedCity)?.nome}
                </span>
              )}
            </h2>

            {/* Filtros ativos e botão limpar */}
            {(selectedCity || selectedType || searchTerm) && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Filtros ativos:</span>
                  {selectedType && (
                    <span className="bg-accent/10 text-accent px-3 py-1 rounded-full border border-accent/20">
                      {selectedType}
                    </span>
                  )}
                  {selectedCity && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                      {cidades.find(c => c.id === selectedCity)?.nome}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full border border-gray-300">
                      &quot;{searchTerm}&quot;
                    </span>
                  )}
                </div>
                <button
                  onClick={clearFilters}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full transition duration-300 flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg"
                >
                  <span>Limpar Filtros</span>
                  <span className="text-xs">✕</span>
                </button>
              </div>
            )}

            {/* Contador de resultados */}
            <div className="mt-4 text-sm text-gray-600 text-center">
              {loadingImoveis ? (
                <span>Carregando...</span>
              ) : (
                <span>
                  {totalItems === 0 ? 'Nenhum imóvel encontrado' :
                    totalItems === 1 ? '1 imóvel encontrado' :
                      `${totalItems} imóveis encontrados`}
                </span>
              )}
            </div>

            {/* Linha divisória */}
            <div className="mt-6 w-24 h-1 bg-accent mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loadingImoveis ? (
              // Loading skeleton
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
                  <div className="w-full h-40 bg-gray-300"></div>
                  <div className="p-4">
                    <div className="h-3 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded mb-3"></div>
                    <div className="h-5 bg-gray-300 rounded mb-3"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-300 rounded w-12"></div>
                      <div className="h-3 bg-gray-300 rounded w-12"></div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : imoveis.length > 0 ? (
              imoveis.map((imovel, index) => (
                <div key={`${imovel.id}-${index}`} onClick={() => openPropertyModal(imovel)} className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 cursor-pointer relative">
                  {/* Badge DESTAQUE (apenas para os primeiros 4 quando não há filtros) */}
                  {!selectedCity && !selectedType && !searchTerm && index < 4 && imoveisDestaque.some(d => d.id === imovel.id) && (
                    <div className="absolute top-3 right-3 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                      DESTAQUE
                    </div>
                  )}
                  
                  <Image
                    src={imovel.imagens[0]?.url || '/hero-bg.jpg'}
                    alt={imovel.nome}
                    width={300}
                    height={200}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <p className="text-xs text-gray-500">{imovel.tipo} • {imovel.bairro || imovel.cidade?.nome}</p>
                    <h3 className="text-lg font-bold text-primary mt-1 truncate">{imovel.nome}</h3>
                    
                    {/* Valores com Badges */}
                    <div className="mt-3">
                      {(() => {
                        const priceComponents = getPropertyPriceComponents(imovel);
                        if (priceComponents.length === 0) {
                          return <p className="text-xl font-semibold text-accent">Consulte</p>;
                        }
                        
                        return (
                          <div className="flex flex-wrap gap-2">
                            {priceComponents.map((component, idx) => (
                              <div key={component.type} className="flex-1 min-w-0">
                                <div className={`text-xs font-bold px-2 py-1 rounded-md text-white mb-1 ${
                                  component.type === 'venda' ? 'bg-green-500' : 'bg-blue-500'
                                }`}>
                                  {component.badge}
                                </div>
                                <p className={`text-lg font-semibold ${
                                  component.type === 'venda' ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                  {component.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-3 flex justify-between items-center text-gray-600 border-t pt-3">
                      <span className="flex items-center text-sm"><BedDouble className="w-4 h-4 mr-1 text-accent" /> {imovel.quartos}</span>
                      <span className="flex items-center text-sm"><Bath className="w-4 h-4 mr-1 text-accent" /> {imovel.banheiros}</span>
                      <span className="flex items-center text-sm"><Ruler className="w-4 h-4 mr-1 text-accent" /> {imovel.area_total || 0} m²</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-gray-600">Nenhum imóvel encontrado com os filtros aplicados.</p>
            )}
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          )}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-12 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-2">
              Nossos Serviços
            </h2>
            <div className="mt-4 w-24 h-1 bg-accent mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg text-center">
                <div className="flex justify-center mb-3">
                  {service.icon}
                </div>
                <h3 className="text-lg font-bold text-primary mt-3">{service.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact-section" className="py-12 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">Entre em Contato</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">Estamos prontos para atendê-lo. Envie sua mensagem ou venha nos visitar.</p>
            <div className="mt-6 w-24 h-1 bg-accent mx-auto rounded-full"></div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white p-8 rounded-lg">
              <h2 className="text-2xl font-bold text-primary">Envie uma Mensagem</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700">Nome</label>
                  <input
                    type="text"
                    id="name"
                    className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                    {...register('name', {
                      required: 'Nome é obrigatório',
                      validate: (value) => {
                        const names = value.trim().split(' ').filter(name => name.length > 0);
                        return names.length >= 2 || 'Digite pelo menos nome e sobrenome';
                      }
                    })}
                  />
                  {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">E-mail</label>
                  <input
                    type="email"
                    id="email"
                    className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                    {...register('email', {
                      required: 'E-mail é obrigatório',
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                        message: 'E-mail inválido'
                      }
                    })}
                  />
                  {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    id="phone"
                    placeholder="(99) 99999-9999"
                    className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                    {...register('phone', {
                      required: 'Telefone é obrigatório',
                      pattern: {
                        value: /^\(\d{2}\) \d{5}-\d{4}$/,
                        message: 'Formato inválido. Use (99) 99999-9999'
                      },
                      validate: (value) => {
                        const numbers = value.replace(/\D/g, '');
                        return numbers.length === 11 || 'Telefone deve ter 11 dígitos';
                      }
                    })}
                    onChange={handlePhoneChange}
                  />
                  {errors.phone && <span className="text-red-500 text-sm">{errors.phone.message}</span>}
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700">Mensagem</label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Digite sua mensagem (mínimo 20 caracteres)"
                    className="w-full mt-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                    {...register('message', {
                      required: 'Mensagem é obrigatória',
                      minLength: {
                        value: 20,
                        message: 'Mensagem deve ter pelo menos 20 caracteres'
                      }
                    })}
                  ></textarea>
                  {errors.message && <span className="text-red-500 text-sm">{errors.message.message}</span>}
                </div>
                <button type="submit" className="w-full bg-accent text-white font-bold p-3 rounded-md hover:opacity-90 transition duration-300">Enviar Mensagem</button>
              </form>
            </div>

            {/* Info & Map */}
            <div>
              <div className="space-y-6">
                <div className="flex items-start">
                  <Phone className="text-accent w-6 h-6 mt-1 mr-4" />
                  <div>
                    <h3 className="text-lg font-bold text-primary">Telefone & WhatsApp</h3>
                    <p className="text-gray-600 mb-2">(18) 99739-8482</p>
                    <div className="flex gap-2">
                      <a href="tel:18997398482" className="inline-flex items-center bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-md hover:bg-blue-700 transition duration-300">
                        <Phone className="w-4 h-4 mr-1" />
                        Ligar
                      </a>
                      <a href="https://wa.me/5518997398482" target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-green-600 text-white text-sm font-semibold px-3 py-1 rounded-md hover:bg-green-700 transition duration-300">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="text-accent w-6 h-6 mt-1 mr-4" />
                  <div>
                    <h3 className="text-lg font-bold text-primary">E-mail</h3>
                    <p className="text-gray-600">j.r.imoveis@hotmail.com</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="text-accent w-6 h-6 mt-1 mr-4" />
                  <div>
                    <h3 className="text-lg font-bold text-primary">Endereço</h3>
                    <p className="text-gray-600">Regente Feijó - SP</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="text-accent w-6 h-6 mt-1 mr-4" />
                  <div>
                    <h3 className="text-lg font-bold text-primary">Horário de Funcionamento</h3>
                    <p className="text-gray-600">Segunda a Sexta: 9h às 18h<br />Sábado: 9h às 13h</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 rounded-lg overflow-hidden">
                <MapComponent />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Property Details Modal */}
      {isModalOpen && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closePropertyModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={closePropertyModal} className="absolute top-3 right-3 bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition text-2xl w-10 h-10 flex items-center justify-center z-10 text-gray-700">×</button>
            <div className="p-6 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-primary mb-3">{selectedProperty.nome}</h1>
              <p className="text-base text-gray-600 mb-4 flex items-center justify-center sm:justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                {selectedProperty.bairro && `${selectedProperty.bairro}, `}{selectedProperty.cidade?.nome}
              </p>

              <div className="mb-4">
                {selectedProperty.imagens && selectedProperty.imagens.length > 1 ? (
                  <Carousel
                    showArrows={true}
                    showStatus={false}
                    showThumbs={false}
                    infiniteLoop={true}
                    className="property-carousel"
                  >
                    {selectedProperty.imagens.map((imagem, index) => (
                      <div key={imagem.id} className="cursor-pointer" onClick={() => openImageModal(imagem.url)}>
                        <Image
                          src={imagem.url}
                          alt={`${selectedProperty.nome} - Foto ${index + 1}`}
                          width={800}
                          height={400}
                          className="rounded-lg w-full h-64 object-cover"
                        />
                      </div>
                    ))}
                  </Carousel>
                ) : (
                  <div className="cursor-pointer" onClick={() => openImageModal(selectedProperty.imagens[0]?.url || '/hero-bg.jpg')}>
                    <Image
                      src={selectedProperty.imagens[0]?.url || '/hero-bg.jpg'}
                      alt={selectedProperty.nome}
                      width={800}
                      height={400}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Valores com Badges */}
              <div className="mb-4">
                {(() => {
                  const priceComponents = getPropertyPriceComponents(selectedProperty);
                  if (priceComponents.length === 0) {
                    return <p className="text-2xl font-bold text-accent">Consulte</p>;
                  }
                  
                  return (
                    <div className="flex flex-wrap gap-4">
                      {priceComponents.map((component) => (
                        <div key={component.type} className="flex-1 min-w-0">
                          <div className={`text-sm font-bold px-3 py-1 rounded-md text-white mb-2 ${
                            component.type === 'venda' ? 'bg-green-500' : 'bg-blue-500'
                          }`}>
                            {component.badge}
                          </div>
                          <p className={`text-2xl font-bold ${
                            component.type === 'venda' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {component.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 justify-items-center sm:justify-items-start">
                <div className="flex items-center">
                  <BedDouble className="w-6 h-6 text-accent mr-2 flex-shrink-0" />
                  <span className="text-primary min-w-0">{selectedProperty.quartos} {selectedProperty.quartos === 1 ? 'Quarto' : 'Quartos'}</span>
                </div>
                <div className="flex items-center">
                  <Bath className="w-6 h-6 text-accent mr-2 flex-shrink-0" />
                  <span className="text-primary min-w-0">{selectedProperty.banheiros} {selectedProperty.banheiros === 1 ? 'Banheiro' : 'Banheiros'}</span>
                </div>
                <div className="flex items-center">
                  <Ruler className="w-6 h-6 text-accent mr-2 flex-shrink-0" />
                  <span className="text-primary min-w-0">{selectedProperty.area_total || 0} m²</span>
                </div>
              </div>

              {selectedProperty.descricao && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Descrição</h2>
                  <p className="text-primary">{selectedProperty.descricao}</p>
                </div>
              )}

              {selectedProperty.caracteristicas && selectedProperty.caracteristicas.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Características</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 justify-items-center sm:justify-items-start">
                    {selectedProperty.caracteristicas.map((caracteristica, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                        <span className="text-primary">{caracteristica}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedProperty.comodidades && selectedProperty.comodidades.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Comodidades</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 justify-items-center sm:justify-items-start">
                    {selectedProperty.comodidades.map((comodidade, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                        <span className="text-primary">{comodidade}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedProperty.endereco_completo && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Endereço</h2>
                  <p className="text-primary">{selectedProperty.endereco_completo}</p>
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <a
                  href={`https://wa.me/5518997398482?text=Olá! Estou interessado no imóvel: ${selectedProperty.nome}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-accent text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition duration-300 flex items-center"
                >
                  <MessageCircle className="mr-2" /> Tenho interesse
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4" onClick={closeImageModal}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 bg-gray-300 text-gray-700 p-2 rounded-full hover:bg-gray-400 transition text-2xl w-10 h-10 flex items-center justify-center z-10"
            >
              ×
            </button>
            <Image
              src={selectedImage}
              alt="Imagem ampliada"
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;