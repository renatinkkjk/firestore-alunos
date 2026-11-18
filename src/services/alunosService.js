'use strict';

/**
 * Regras de acesso ao Firestore: CRUD + consultas da coleção `alunos`.
 * Toda a lógica de banco fica aqui — o menu apenas chama estas funções.
 */

const { obterDb, FieldValue } = require('../config/firebase');
const {
  montarAluno,
  montarAtualizacao,
  validarTurma,
  validarDataNascimento,
} = require('../utils/validacao');

const COLECAO = 'alunos';

/** Erro usado quando o documento informado não existe. */
class ErroNaoEncontrado extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroNaoEncontrado';
  }
}

function colecao() {
  return obterDb().collection(COLECAO);
}

/** Converte um DocumentSnapshot em um objeto simples. */
function docParaAluno(doc) {
  const dados = doc.data() ?? {};
  return {
    id: doc.id,
    nome: dados.nome ?? '',
    turma: dados.turma ?? '',
    dataNascimento: dados.dataNascimento ?? '',
    ativo: Boolean(dados.ativo),
    criadoEm: dados.criadoEm ?? null,
    atualizadoEm: dados.atualizadoEm ?? null,
  };
}

/** Ordena por nome respeitando acentos do português. */
function ordenarPorNome(lista) {
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}

function exigirId(id) {
  const texto = String(id ?? '').trim();
  if (!texto) throw new Error('Informe o ID do aluno.');
  return texto;
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

/**
 * Cadastra um aluno.
 * @param {{nome: string, turma: string, dataNascimento: string, ativo: boolean|string}} dados
 * @returns {Promise<{id: string, nome: string, turma: string, dataNascimento: string, ativo: boolean}>}
 */
async function cadastrarAluno(dados) {
  const aluno = montarAluno(dados);

  const referencia = await colecao().add({
    ...aluno,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });

  return { id: referencia.id, ...aluno };
}

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

/** Lista todos os alunos, ordenados por nome. */
async function listarAlunos() {
  const snapshot = await colecao().get();
  return ordenarPorNome(snapshot.docs.map(docParaAluno));
}

/** Busca um aluno pelo ID. Retorna null se não existir. */
async function buscarAlunoPorId(id) {
  const documento = await colecao().doc(exigirId(id)).get();
  return documento.exists ? docParaAluno(documento) : null;
}

/** Lista os alunos de uma turma (comparação exata, ex.: "3A"). */
async function listarAlunosPorTurma(turma) {
  const turmaNormalizada = validarTurma(turma);

  const snapshot = await colecao().where('turma', '==', turmaNormalizada).get();
  return ordenarPorNome(snapshot.docs.map(docParaAluno));
}

/** Lista os alunos com a data de nascimento exata (AAAA-MM-DD). */
async function listarAlunosPorDataNascimento(dataNascimento) {
  const dataNormalizada = validarDataNascimento(dataNascimento);

  const snapshot = await colecao().where('dataNascimento', '==', dataNormalizada).get();
  return ordenarPorNome(snapshot.docs.map(docParaAluno));
}

/**
 * Consulta extra: aniversariantes de um mês (1 a 12).
 * O Firestore não consulta "mês de uma data em texto", então filtramos em memória.
 */
async function listarAniversariantesDoMes(mes) {
  const numeroMes = Number(mes);
  if (!Number.isInteger(numeroMes) || numeroMes < 1 || numeroMes > 12) {
    throw new Error('Informe o mês como número de 1 a 12.');
  }

  const todos = await listarAlunos();
  const prefixo = `-${String(numeroMes).padStart(2, '0')}-`;

  return todos.filter((aluno) => aluno.dataNascimento.slice(4, 8) === prefixo);
}

/** Quantidade total de alunos (útil para o menu/seed). */
async function contarAlunos() {
  const snapshot = await colecao().get();
  return snapshot.size;
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

/**
 * Atualiza um aluno (atualização parcial: só os campos informados mudam).
 * @param {string} id
 * @param {object} dados campos a alterar
 * @returns {Promise<object>} aluno atualizado
 */
async function atualizarAluno(id, dados) {
  const alunoAtual = await buscarAlunoPorId(id);
  if (!alunoAtual) {
    throw new ErroNaoEncontrado(`Nenhum aluno encontrado com o ID "${String(id).trim()}".`);
  }

  const atualizacao = montarAtualizacao(dados);
  if (Object.keys(atualizacao).length === 0) {
    throw new Error('Nenhum campo foi informado para atualizar.');
  }

  await colecao()
    .doc(alunoAtual.id)
    .update({
      ...atualizacao,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

  return { ...alunoAtual, ...atualizacao };
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

/** Exclui um aluno e retorna os dados do registro removido. */
async function excluirAluno(id) {
  const aluno = await buscarAlunoPorId(id);
  if (!aluno) {
    throw new ErroNaoEncontrado(`Nenhum aluno encontrado com o ID "${String(id).trim()}".`);
  }

  await colecao().doc(aluno.id).delete();
  return aluno;
}

module.exports = {
  COLECAO,
  ErroNaoEncontrado,
  cadastrarAluno,
  listarAlunos,
  buscarAlunoPorId,
  listarAlunosPorTurma,
  listarAlunosPorDataNascimento,
  listarAniversariantesDoMes,
  contarAlunos,
  atualizarAluno,
  excluirAluno,
};
