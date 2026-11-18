'use strict';

/**
 * Configuração do Firebase Admin SDK / Cloud Firestore.
 *
 * Ordem de busca das credenciais:
 *   1. Variável FIREBASE_SERVICE_ACCOUNT_JSON (JSON completo em uma linha)
 *   2. Arquivo apontado por GOOGLE_APPLICATION_CREDENTIALS
 *   3. Arquivo ./serviceAccountKey.json na raiz do projeto (padrão)
 *   4. Emulador do Firestore (FIRESTORE_EMULATOR_HOST), que dispensa credenciais
 */

const fs = require('node:fs');
const path = require('node:path');

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

/** Raiz do projeto (dois níveis acima de src/config). */
const RAIZ_PROJETO = path.resolve(__dirname, '..', '..');

/** Erro de configuração — usado para avisar o usuário sem derrubar o programa. */
class ErroConfiguracao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroConfiguracao';
  }
}

const TEXTO_AJUDA = [
  '',
  'Como resolver:',
  '  1. Acesse https://console.firebase.google.com e crie (ou abra) seu projeto.',
  '  2. Ative o Cloud Firestore (modo de teste ou produção).',
  '  3. Configurações do projeto > Contas de serviço > "Gerar nova chave privada".',
  '  4. Salve o arquivo baixado como serviceAccountKey.json na raiz deste projeto.',
  '  5. Rode novamente: npm start',
  '',
  'O serviceAccountKey.json está no .gitignore e nunca deve ser enviado ao GitHub.',
].join('\n');

function caminhoPadraoCredencial() {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : path.join(RAIZ_PROJETO, 'serviceAccountKey.json');
}

function lerJsonCredencial(caminho) {
  let conteudo;
  try {
    conteudo = fs.readFileSync(caminho, 'utf8');
  } catch {
    throw new ErroConfiguracao(`Não foi possível ler o arquivo de credenciais:\n  ${caminho}${TEXTO_AJUDA}`);
  }

  let json;
  try {
    json = JSON.parse(conteudo);
  } catch {
    throw new ErroConfiguracao(
      `O arquivo ${path.basename(caminho)} não é um JSON válido. Baixe a chave novamente no console do Firebase.${TEXTO_AJUDA}`,
    );
  }

  if (!json.project_id || !json.client_email || !json.private_key) {
    throw new ErroConfiguracao(
      `O arquivo ${path.basename(caminho)} não parece ser uma chave de conta de serviço do Firebase.${TEXTO_AJUDA}`,
    );
  }

  return json;
}

/** Cria o objeto de credencial do Admin SDK. */
function resolverCredencial() {
  // Emulador local: não precisa de chave.
  if (process.env.FIRESTORE_EMULATOR_HOST) return null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let json;
    try {
      json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new ErroConfiguracao('A variável FIREBASE_SERVICE_ACCOUNT_JSON não contém um JSON válido.');
    }
    return cert(json);
  }

  const caminho = caminhoPadraoCredencial();
  if (!fs.existsSync(caminho)) {
    throw new ErroConfiguracao(`Arquivo de credenciais não encontrado:\n  ${caminho}${TEXTO_AJUDA}`);
  }

  return cert(lerJsonCredencial(caminho));
}

/**
 * Verifica a configuração no início do programa.
 * Retorna { ok, mensagem } em vez de lançar erro, para o menu ainda poder abrir.
 */
function verificarConfiguracao() {
  try {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      return { ok: true, mensagem: `Usando emulador do Firestore em ${process.env.FIRESTORE_EMULATOR_HOST}.` };
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return { ok: true, mensagem: 'Credenciais carregadas de FIREBASE_SERVICE_ACCOUNT_JSON.' };
    }

    const caminho = caminhoPadraoCredencial();
    if (!fs.existsSync(caminho)) {
      return { ok: false, mensagem: `Arquivo de credenciais não encontrado:\n  ${caminho}${TEXTO_AJUDA}` };
    }

    const json = lerJsonCredencial(caminho);
    return { ok: true, mensagem: `Conectado ao projeto Firebase "${json.project_id}".` };
  } catch (erro) {
    return { ok: false, mensagem: erro.message };
  }
}

let banco = null;

/**
 * Retorna a instância do Firestore, inicializando o Admin SDK na primeira chamada.
 * @returns {import('firebase-admin/firestore').Firestore}
 */
function obterDb() {
  if (banco) return banco;

  if (getApps().length === 0) {
    const credencial = resolverCredencial();

    if (credencial) {
      initializeApp({ credential: credencial });
    } else {
      // Modo emulador
      initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-alunos' });
    }
  }

  banco = getFirestore();
  banco.settings({ ignoreUndefinedProperties: true });

  return banco;
}

module.exports = {
  ErroConfiguracao,
  obterDb,
  verificarConfiguracao,
  FieldValue,
  Timestamp,
  RAIZ_PROJETO,
};
