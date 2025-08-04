const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Dados dos clientes
const clientes = [
  {
    nome: 'Maria Silva Santos',
    email: 'maria.silva.seed@email.com',
    telefone: '(18) 99911-1111',
    cpf_cnpj: '123.456.789-01',
    endereco: 'Rua das Flores, 123 - Centro, Regente Feijó - SP',
    observacoes: 'Interessada em casas e apartamentos'
  },
  {
    nome: 'João Carlos Oliveira',
    email: 'joao.oliveira.seed@email.com',
    telefone: '(18) 99922-2222',
    cpf_cnpj: '234.567.890-12',
    endereco: 'Av. Principal, 456 - Jardim América, Regente Feijó - SP',
    observacoes: 'Procura imóveis comerciais'
  },
  {
    nome: 'Ana Paula Costa',
    email: 'ana.costa.seed@email.com',
    telefone: '(18) 99933-3333',
    cpf_cnpj: '345.678.901-23',
    endereco: 'Rua do Comércio, 789 - Vila Nova, Regente Feijó - SP',
    observacoes: 'Interessada em fazendas e sítios'
  },
  {
    nome: 'Pedro Henrique Lima',
    email: 'pedro.lima.seed@email.com',
    telefone: '(18) 99944-4444',
    cpf_cnpj: '456.789.012-34',
    endereco: 'Rua das Palmeiras, 321 - Jardim Europa, Regente Feijó - SP',
    observacoes: 'Procura terrenos para construção'
  },
  {
    nome: 'Fernanda Rodrigues',
    email: 'fernanda.rodrigues.seed@email.com',
    telefone: '(18) 99955-5555',
    cpf_cnpj: '567.890.123-45',
    endereco: 'Av. São Paulo, 654 - Centro, Regente Feijó - SP',
    observacoes: 'Interessada em apartamentos de luxo'
  },
  {
    nome: 'Carlos Eduardo Martins',
    email: 'carlos.martins.seed@email.com',
    telefone: '(18) 99966-6666',
    cpf_cnpj: '678.901.234-56',
    endereco: 'Rua das Acácias, 987 - Jardim Primavera, Regente Feijó - SP',
    observacoes: 'Procura casas de campo'
  },
  {
    nome: 'Juliana Ferreira',
    email: 'juliana.ferreira.seed@email.com',
    telefone: '(18) 99977-7777',
    cpf_cnpj: '789.012.345-67',
    endereco: 'Rua dos Ipês, 147 - Vila Industrial, Regente Feijó - SP',
    observacoes: 'Interessada em lofts e apartamentos modernos'
  },
  {
    nome: 'Roberto Almeida',
    email: 'roberto.almeida.seed@email.com',
    telefone: '(18) 99988-8888',
    cpf_cnpj: '890.123.456-78',
    endereco: 'Av. Brasil, 258 - Jardim Brasil, Regente Feijó - SP',
    observacoes: 'Procura casas geminadas'
  },
  {
    nome: 'Lucia Mendes',
    email: 'lucia.mendes.seed@email.com',
    telefone: '(18) 99999-9999',
    cpf_cnpj: '901.234.567-89',
    endereco: 'Rua das Margaridas, 369 - Jardim das Flores, Regente Feijó - SP',
    observacoes: 'Interessada em terrenos residenciais'
  },
  {
    nome: 'Ricardo Souza',
    email: 'ricardo.souza.seed@email.com',
    telefone: '(18) 99900-0000',
    cpf_cnpj: '012.345.678-90',
    endereco: 'Rua dos Cravos, 741 - Vila São José, Regente Feijó - SP',
    observacoes: 'Procura imóveis para investimento'
  }
];

// Dados dos imóveis com imagens do Unsplash
const imoveis = [
  {
    nome: 'Casa Moderna com Piscina',
    tipo: 'Casa',
    finalidade: 'venda',
    valor_venda: 850000,
    valor_aluguel: null,
    quartos: 4,
    banheiros: 3,
    area_total: 280,
    bairro: 'Jardim Europa',
    endereco_completo: 'Rua das Palmeiras, 150 - Jardim Europa, Regente Feijó - SP',
    descricao: 'Linda casa moderna com acabamento de alto padrão, piscina, churrasqueira e ampla área de lazer. Ideal para família que busca conforto e sofisticação.',
    caracteristicas: ['Piscina', 'Churrasqueira', 'Jardim', 'Garagem para 2 carros', 'Área gourmet'],
    comodidades: ['Ar condicionado', 'Closet', 'Lareira', 'Home theater', 'Cozinha americana'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '1',
    imagens: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Apartamento Luxuoso no Centro',
    tipo: 'Apartamento',
    finalidade: 'aluguel',
    valor_venda: null,
    valor_aluguel: 3500,
    quartos: 3,
    banheiros: 2,
    area_total: 120,
    bairro: 'Centro',
    endereco_completo: 'Av. Principal, 500 - Centro, Regente Feijó - SP',
    descricao: 'Apartamento moderno e elegante no coração da cidade, com vista panorâmica e acabamento de primeira linha.',
    caracteristicas: ['Vista panorâmica', 'Sacada gourmet', 'Academia', 'Piscina', 'Salão de festas'],
    comodidades: ['Ar condicionado', 'Closet', 'Cozinha planejada', 'Lavanderia', 'Vaga coberta'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '2',
    imagens: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Fazenda para Investimento',
    tipo: 'Fazenda',
    finalidade: 'venda',
    valor_venda: 2500000,
    valor_aluguel: null,
    quartos: 6,
    banheiros: 4,
    area_total: 1500,
    bairro: 'Zona Rural',
    endereco_completo: 'Estrada Rural, Km 15 - Zona Rural, Regente Feijó - SP',
    descricao: 'Fazenda produtiva com 150 hectares, casa sede luxuosa, currais, silos e toda infraestrutura para pecuária.',
    caracteristicas: ['150 hectares', 'Casa sede', 'Currais', 'Silos', 'Lago artificial'],
    comodidades: ['Heliporto', 'Gerador', 'Poço artesiano', 'Casa do caseiro', 'Galpões'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '3',
    imagens: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Terreno Comercial Premium',
    tipo: 'Terreno',
    finalidade: 'venda',
    valor_venda: 450000,
    valor_aluguel: null,
    quartos: 0,
    banheiros: 0,
    area_total: 800,
    bairro: 'Centro Comercial',
    endereco_completo: 'Av. Comercial, 200 - Centro Comercial, Regente Feijó - SP',
    descricao: 'Terreno comercial em localização estratégica, ideal para construção de shopping, supermercado ou complexo comercial.',
    caracteristicas: ['Localização estratégica', 'Frente para avenida', 'Topografia plana', 'Infraestrutura completa'],
    comodidades: ['Água', 'Esgoto', 'Energia', 'Asfalto', 'Iluminação pública'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '4',
    imagens: [
      'https://images.unsplash.com/photo-1726592058743-384b550930a6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Casa de Campo com Vista',
    tipo: 'Casa',
    finalidade: 'ambos',
    valor_venda: 1200000,
    valor_aluguel: 4500,
    quartos: 5,
    banheiros: 4,
    area_total: 400,
    bairro: 'Jardim das Flores',
    endereco_completo: 'Rua das Margaridas, 300 - Jardim das Flores, Regente Feijó - SP',
    descricao: 'Casa de campo com vista deslumbrante, ampla área de lazer e acabamento sofisticado. Perfeita para quem busca tranquilidade sem abrir mão do conforto.',
    caracteristicas: ['Vista panorâmica', 'Piscina', 'Churrasqueira', 'Jardim', 'Horta orgânica'],
    comodidades: ['Ar condicionado', 'Lareira', 'Home theater', 'Cozinha gourmet', 'Quarto de hóspedes'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '5',
    imagens: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Apartamento Duplex',
    tipo: 'Apartamento',
    finalidade: 'venda',
    valor_venda: 680000,
    valor_aluguel: null,
    quartos: 4,
    banheiros: 3,
    area_total: 180,
    bairro: 'Jardim América',
    endereco_completo: 'Rua das Acácias, 450 - Jardim América, Regente Feijó - SP',
    descricao: 'Apartamento duplex com design moderno, ampla varanda gourmet e acabamento de alto padrão.',
    caracteristicas: ['Duplex', 'Varanda gourmet', 'Academia', 'Piscina', 'Salão de festas'],
    comodidades: ['Ar condicionado', 'Closet', 'Cozinha planejada', 'Lavanderia', 'Vaga coberta'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '6',
    imagens: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Sítio para Lazer',
    tipo: 'Sítio',
    finalidade: 'venda',
    valor_venda: 1800000,
    valor_aluguel: null,
    quartos: 4,
    banheiros: 3,
    area_total: 2500,
    bairro: 'Zona Rural',
    endereco_completo: 'Estrada do Sítio, Km 8 - Zona Rural, Regente Feijó - SP',
    descricao: 'Sítio encantador com casa rústica, lago, pomar e ampla área de lazer. Ideal para quem busca contato com a natureza.',
    caracteristicas: ['Lago artificial', 'Pomar', 'Horta', 'Casa rústica', 'Área de camping'],
    comodidades: ['Gerador', 'Poço artesiano', 'Casa do caseiro', 'Galpão', 'Churrasqueira'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '7',
    imagens: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Loft Industrial',
    tipo: 'Apartamento',
    finalidade: 'aluguel',
    valor_venda: null,
    valor_aluguel: 2800,
    quartos: 2,
    banheiros: 1,
    area_total: 85,
    bairro: 'Vila Industrial',
    endereco_completo: 'Rua dos Ipês, 200 - Vila Industrial, Regente Feijó - SP',
    descricao: 'Loft com design industrial, pé direito alto e acabamento moderno. Perfeito para jovens profissionais.',
    caracteristicas: ['Pé direito alto', 'Design industrial', 'Mezanino', 'Exposição norte', 'Varanda'],
    comodidades: ['Ar condicionado', 'Cozinha americana', 'Lavanderia', 'Vaga descoberta', 'Portaria 24h'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '8',
    imagens: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Casa Geminada',
    tipo: 'Casa',
    finalidade: 'ambos',
    valor_venda: 750000,
    valor_aluguel: 3200,
    quartos: 3,
    banheiros: 2,
    area_total: 200,
    bairro: 'Jardim Brasil',
    endereco_completo: 'Av. Brasil, 150 - Jardim Brasil, Regente Feijó - SP',
    descricao: 'Casa geminada com acabamento de qualidade, jardim privativo e localização privilegiada.',
    caracteristicas: ['Casa geminada', 'Jardim privativo', 'Garagem', 'Área de serviço', 'Sacada'],
    comodidades: ['Ar condicionado', 'Cozinha planejada', 'Lavanderia', 'Quarto de serviço', 'Área gourmet'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '9',
    imagens: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop'
    ]
  },
  {
    nome: 'Terreno Residencial',
    tipo: 'Terreno',
    finalidade: 'venda',
    valor_venda: 280000,
    valor_aluguel: null,
    quartos: 0,
    banheiros: 0,
    area_total: 500,
    bairro: 'Vila São José',
    endereco_completo: 'Rua dos Cravos, 100 - Vila São José, Regente Feijó - SP',
    descricao: 'Terreno residencial em bairro tranquilo, ideal para construção da casa dos sonhos.',
    caracteristicas: ['Topografia plana', 'Frente para rua', 'Esquina', 'Infraestrutura completa'],
    comodidades: ['Água', 'Esgoto', 'Energia', 'Asfalto', 'Iluminação pública'],
    cidade_id: '216703b1-21fb-4e56-a793-18852059f477',
    cliente_id: '10',
    imagens: [
      'https://images.unsplash.com/photo-1726592058743-384b550930a6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop'
    ]
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Inserir clientes
    console.log('📝 Inserindo clientes...');
    const { data: clientesInseridos, error: errorClientes } = await supabase
      .from('clientes')
      .insert(clientes)
      .select();

    if (errorClientes) {
      console.error('❌ Erro ao inserir clientes:', errorClientes);
      return;
    }

    console.log(`✅ ${clientesInseridos.length} clientes inseridos com sucesso!`);

    // Preparar imóveis com cliente_id correto e remover campo imagens
    const imoveisComCliente = imoveis.map((imovel, index) => {
      const { imagens, ...imovelSemImagens } = imovel;
      return {
        ...imovelSemImagens,
        cliente_id: clientesInseridos[index].id
      };
    });

    // Inserir imóveis
    console.log('🏠 Inserindo imóveis...');
    const { data: imoveisInseridos, error: errorImoveis } = await supabase
      .from('imoveis')
      .insert(imoveisComCliente)
      .select();

    if (errorImoveis) {
      console.error('❌ Erro ao inserir imóveis:', errorImoveis);
      return;
    }

    console.log(`✅ ${imoveisInseridos.length} imóveis inseridos com sucesso!`);

    // Inserir imagens dos imóveis
    console.log('🖼️ Inserindo imagens dos imóveis...');
    const imagensParaInserir = [];
    
    imoveisInseridos.forEach((imovel, index) => {
      const imagensImovel = imoveis[index].imagens.map((url, imgIndex) => ({
        imovel_id: imovel.id,
        url: url,
        ordem: imgIndex + 1
      }));
      imagensParaInserir.push(...imagensImovel);
    });

    const { data: imagensInseridas, error: errorImagens } = await supabase
      .from('imovel_imagens')
      .insert(imagensParaInserir)
      .select();

    if (errorImagens) {
      console.error('❌ Erro ao inserir imagens:', errorImagens);
      return;
    }

    console.log(`✅ ${imagensInseridas.length} imagens inseridas com sucesso!`);

    console.log('🎉 Seed do banco de dados concluído com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   - ${clientesInseridos.length} clientes`);
    console.log(`   - ${imoveisInseridos.length} imóveis`);
    console.log(`   - ${imagensInseridas.length} imagens`);

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
  }
}

// Executar o seed
seedDatabase(); 