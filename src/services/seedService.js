'use strict';

/** Insere os dados fictícios da demonstração na coleção `alunos`. */

const { ALUNOS_FICTICIOS } = require('../data/alunosFicticios');
const alunosService = require('./alunosService');

/**
 * Insere todos os alunos fictícios e devolve a lista com os IDs criados.
 * @param {(aluno: object) => void} [aoInserir] callback opcional para log
 */
async function popularComDadosFicticios(aoInserir) {
  const inseridos = [];

  for (const aluno of ALUNOS_FICTICIOS) {
    const criado = await alunosService.cadastrarAluno(aluno);
    inseridos.push(criado);
    if (typeof aoInserir === 'function') aoInserir(criado);
  }

  return inseridos;
}

module.exports = { popularComDadosFicticios };
