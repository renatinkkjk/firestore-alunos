'use strict';

/** Impressão dos alunos em formato de tabela no terminal. */

function formatarValor(valor) {
  if (valor === undefined || valor === null || valor === '') return '-';
  return String(valor);
}

function formatarSimNao(valor) {
  return valor ? 'sim' : 'não';
}

/**
 * Imprime uma lista de alunos como tabela.
 * @param {Array<object>} alunos
 * @param {{titulo?: string}} [opcoes]
 */
function imprimirTabela(alunos, opcoes = {}) {
  if (opcoes.titulo) console.log(`\n${opcoes.titulo}`);

  if (!Array.isArray(alunos) || alunos.length === 0) {
    console.log('  (nenhum registro encontrado)');
    return;
  }

  const cabecalho = ['ID', 'NOME', 'TURMA', 'NASCIMENTO', 'ATIVO'];
  const linhas = alunos.map((aluno) => [
    formatarValor(aluno.id),
    formatarValor(aluno.nome),
    formatarValor(aluno.turma),
    formatarValor(aluno.dataNascimento),
    formatarSimNao(aluno.ativo),
  ]);

  const larguras = cabecalho.map((titulo, indice) =>
    Math.max(titulo.length, ...linhas.map((linha) => String(linha[indice]).length)),
  );

  const montarLinha = (colunas) =>
    colunas
      .map((coluna, indice) => String(coluna).padEnd(larguras[indice]))
      .join('  ')
      .trimEnd();

  console.log(`  ${montarLinha(cabecalho)}`);
  console.log(`  ${larguras.map((largura) => '-'.repeat(largura)).join('  ')}`);

  for (const linha of linhas) {
    console.log(`  ${montarLinha(linha)}`);
  }

  console.log(`\n  Total: ${alunos.length} aluno(s)`);
}

/** Imprime os detalhes de um único aluno (usado nas operações por ID). */
function imprimirAluno(aluno) {
  if (!aluno) {
    console.log('  (nenhum registro encontrado)');
    return;
  }

  const campos = [
    ['ID', aluno.id],
    ['Nome', aluno.nome],
    ['Turma', aluno.turma],
    ['Data de nascimento', aluno.dataNascimento],
    ['Ativo', formatarSimNao(aluno.ativo)],
  ];

  console.log('');
  for (const [rotulo, valor] of campos) {
    console.log(`  ${rotulo.padEnd(20)} ${formatarValor(valor)}`);
  }
}

module.exports = { imprimirTabela, imprimirAluno, formatarSimNao };
