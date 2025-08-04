#!/usr/bin/env node

/**
 * Script para executar processamento automático via cron job
 * 
 * Uso:
 * node scripts/cron-processamento-automatico.js [--data=YYYY-MM-DD] [--forcar] [--verbose]
 * 
 * Exemplos:
 * node scripts/cron-processamento-automatico.js
 * node scripts/cron-processamento-automatico.js --data=2024-01-15
 * node scripts/cron-processamento-automatico.js --forcar --verbose
 * 
 * Configuração do cron (executar diariamente às 6:00):
 * 0 6 * * * /usr/bin/node /path/to/project/scripts/cron-processamento-automatico.js >> /var/log/processamento-automatico.log 2>&1
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configurações
const config = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  cronSecret: process.env.CRON_SECRET_KEY,
  timeout: 300000, // 5 minutos
  retries: 3,
  retryDelay: 5000 // 5 segundos
};

// Argumentos da linha de comando
const args = process.argv.slice(2);
const options = {
  data: null,
  forcar: false,
  verbose: false
};

// Processar argumentos
args.forEach(arg => {
  if (arg.startsWith('--data=')) {
    options.data = arg.split('=')[1];
  } else if (arg === '--forcar') {
    options.forcar = true;
  } else if (arg === '--verbose') {
    options.verbose = true;
  }
});

/**
 * Função para fazer requisição HTTP/HTTPS
 */
function makeRequest(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      },
      timeout: config.timeout
    };

    const req = client.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          reject(new Error(`Erro ao parsear resposta: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Erro na requisição: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout na requisição'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Função para executar com retry
 */
async function executeWithRetry(fn, retries = config.retries) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      console.log(`Tentativa ${i + 1} falhou: ${error.message}`);
      console.log(`Tentando novamente em ${config.retryDelay / 1000} segundos...`);
      
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    }
  }
}

/**
 * Função principal
 */
async function main() {
  const startTime = Date.now();
  
  try {
    console.log('='.repeat(60));
    console.log(`Iniciando processamento automático - ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    if (options.verbose) {
      console.log('Configurações:');
      console.log(`- URL Base: ${config.baseUrl}`);
      console.log(`- Data: ${options.data || 'hoje'}`);
      console.log(`- Forçar execução: ${options.forcar}`);
      console.log(`- Timeout: ${config.timeout / 1000}s`);
      console.log(`- Tentativas: ${config.retries}`);
      console.log('');
    }

    // Verificar se o secret está configurado
    if (!config.cronSecret) {
      throw new Error('CRON_SECRET_KEY não está configurado nas variáveis de ambiente');
    }

    // Preparar dados da requisição
    const requestData = {
      dataReferencia: options.data,
      forcarExecucao: options.forcar
    };

    const headers = {
      'Authorization': `Bearer ${config.cronSecret}`,
      'User-Agent': 'Cron-Job-Processamento-Automatico/1.0'
    };

    // Executar processamento com retry
    const response = await executeWithRetry(async () => {
      return await makeRequest(
        `${config.baseUrl}/api/processamento-automatico`,
        requestData,
        headers
      );
    });

    // Processar resposta
    if (response.statusCode === 200) {
      const result = response.data;
      
      console.log('✅ Processamento concluído com sucesso!');
      console.log('');
      console.log('Resultados:');
      console.log(`- Pagamentos processados: ${result.data.processamento_vencimentos.pagamentos_processados}`);
      console.log(`- Pagamentos vencidos: ${result.data.processamento_vencimentos.pagamentos_vencidos}`);
      console.log(`- Notificações criadas: ${result.data.notificacoes_processadas}`);
      console.log(`- Tempo de execução: ${result.data.tempo_total_execucao_ms}ms`);
      console.log(`- Logs criados: ${result.data.logs_criados}`);
      
      if (result.data.processamento_vencimentos.erros && result.data.processamento_vencimentos.erros.length > 0) {
        console.log('');
        console.log('⚠️  Erros encontrados:');
        result.data.processamento_vencimentos.erros.forEach((erro, index) => {
          console.log(`${index + 1}. ${erro}`);
        });
      }
      
      if (options.verbose && result.erros && result.erros.length > 0) {
        console.log('');
        console.log('Erros críticos:');
        result.erros.forEach((erro, index) => {
          console.log(`${index + 1}. ${erro}`);
        });
      }
      
    } else {
      const result = response.data;
      console.log(`❌ Erro no processamento (HTTP ${response.statusCode})`);
      console.log(`Mensagem: ${result.message || 'Erro desconhecido'}`);
      
      if (result.erros && result.erros.length > 0) {
        console.log('Erros:');
        result.erros.forEach((erro, index) => {
          console.log(`${index + 1}. ${erro}`);
        });
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.log(`❌ Erro crítico: ${error.message}`);
    
    if (options.verbose && error.stack) {
      console.log('Stack trace:');
      console.log(error.stack);
    }
    
    process.exit(1);
    
  } finally {
    const executionTime = Date.now() - startTime;
    console.log('');
    console.log('='.repeat(60));
    console.log(`Execução finalizada - ${new Date().toISOString()}`);
    console.log(`Tempo total: ${executionTime}ms`);
    console.log('='.repeat(60));
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
}

module.exports = { main, config };