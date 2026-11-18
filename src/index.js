'use strict';

/**
 * Ponto de entrada da aplicação.
 * Rode com: npm start
 */

const { iniciarMenu } = require('./ui/menu');
const { verificarConfiguracao } = require('./config/firebase');

async function main() {
  const configuracao = verificarConfiguracao();
  await iniciarMenu(configuracao);
}

main().catch((erro) => {
  if (erro.code === 'ERR_USE_AFTER_CLOSE' || erro.name === 'AbortError') {
    console.log('\nSaindo...');
    process.exit(0);
  }

  console.error('\nERRO INESPERADO:', erro.message);
  process.exitCode = 1;
});
