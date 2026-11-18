'use strict';

/**
 * Validação e normalização dos dados da coleção `alunos`.
 *
 * Campos da coleção:
 *   nome            string  (AAAA... texto)
 *   turma           string  (ex.: "3A")
 *   dataNascimento  string  (formato AAAA-MM-DD)
 *   ativo           boolean
 */

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Erro de dados inválidos — a mensagem é amigável e pode ir direto para o usuário. */
class ErroValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroValidacao';
  }
}

const VERDADEIROS = ['true', 'sim', 's', '1', 'ativo', 'ativa', 'yes', 'y'];
const FALSOS = ['false', 'nao', 'não', 'n', '0', 'inativo', 'inativa', 'no'];

function validarNome(valor) {
  const nome = String(valor ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!nome) throw new ErroValidacao('O nome é obrigatório.');
  if (nome.length < 3) throw new ErroValidacao('O nome deve ter pelo menos 3 caracteres.');
  if (nome.length > 120) throw new ErroValidacao('O nome deve ter no máximo 120 caracteres.');

  return nome;
}

function validarTurma(valor) {
  const turma = String(valor ?? '')
    .trim()
    .toUpperCase();

  if (!turma) throw new ErroValidacao('A turma é obrigatória (ex.: 3A).');
  if (turma.length > 20) throw new ErroValidacao('A turma deve ter no máximo 20 caracteres.');

  return turma;
}

function validarDataNascimento(valor) {
  const data = String(valor ?? '').trim();

  if (!REGEX_DATA.test(data)) {
    throw new ErroValidacao(`Data inválida: "${data}". Use o formato AAAA-MM-DD (ex.: 2008-04-21).`);
  }

  const [ano, mes, dia] = data.split('-').map(Number);
  const verificacao = new Date(Date.UTC(ano, mes - 1, dia));

  const existeNoCalendario =
    verificacao.getUTCFullYear() === ano &&
    verificacao.getUTCMonth() === mes - 1 &&
    verificacao.getUTCDate() === dia;

  if (!existeNoCalendario) {
    throw new ErroValidacao(`A data ${data} não existe no calendário.`);
  }

  if (ano < 1900) {
    throw new ErroValidacao('O ano de nascimento deve ser maior ou igual a 1900.');
  }

  if (verificacao > new Date()) {
    throw new ErroValidacao('A data de nascimento não pode estar no futuro.');
  }

  return data;
}

function validarAtivo(valor) {
  if (typeof valor === 'boolean') return valor;

  const texto = String(valor ?? '').trim().toLowerCase();
  if (VERDADEIROS.includes(texto)) return true;
  if (FALSOS.includes(texto)) return false;

  throw new ErroValidacao('Informe "sim" ou "não" para o campo ativo.');
}

/**
 * Monta o documento completo de um aluno novo.
 * Todos os campos são obrigatórios no CREATE.
 */
function montarAluno(dados = {}) {
  return {
    nome: validarNome(dados.nome),
    turma: validarTurma(dados.turma),
    dataNascimento: validarDataNascimento(dados.dataNascimento),
    ativo: validarAtivo(dados.ativo),
  };
}

/**
 * Monta um objeto de atualização parcial: só entra o que foi informado.
 * Campos vazios (undefined, null ou string vazia) são ignorados.
 */
function montarAtualizacao(dados = {}) {
  const atualizacao = {};
  const informado = (valor) => valor !== undefined && valor !== null && String(valor).trim() !== '';

  if (informado(dados.nome)) atualizacao.nome = validarNome(dados.nome);
  if (informado(dados.turma)) atualizacao.turma = validarTurma(dados.turma);
  if (informado(dados.dataNascimento)) atualizacao.dataNascimento = validarDataNascimento(dados.dataNascimento);
  if (informado(dados.ativo)) atualizacao.ativo = validarAtivo(dados.ativo);

  return atualizacao;
}

module.exports = {
  ErroValidacao,
  validarNome,
  validarTurma,
  validarDataNascimento,
  validarAtivo,
  montarAluno,
  montarAtualizacao,
};
