'use strict';

/**
 * Popula a coleção `alunos` com dados fictícios.
 * Uso: npm run seed
 */

const { popularComDadosFicticios } = require('../services/seedService');

async function main() {
  console.log('Inserindo alunos fictícios no Firestore...\n');

  try {
    const inseridos = await popularComDadosFicticios((aluno) => {
      console.log(`  + ${aluno.nome} (${aluno.turma}) -> ${aluno.id}`);
    });
    console.log(`\nOK: ${inseridos.length} aluno(s) inserido(s) com sucesso.`);
  } catch (erro) {
    console.error(`\nERRO: ${erro.message}`);
    process.exitCode = 1;
  }
}

main();
