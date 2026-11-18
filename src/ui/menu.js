'use strict';

/** Menu interativo do terminal. */

const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const alunosService = require('../services/alunosService');
const { imprimirTabela, imprimirAluno } = require('./tabela');

const LINHA = '='.repeat(62);
const LINHA_FINA = '-'.repeat(62);

const OPCOES = [
  ['1', 'Cadastrar aluno'],
  ['2', 'Listar todos os alunos'],
  ['3', 'Buscar aluno por ID'],
  ['4', 'Atualizar aluno'],
  ['5', 'Excluir aluno'],
  ['6', 'Consultar por turma'],
  ['7', 'Consultar por data de nascimento'],
  ['8', 'Aniversariantes do mês (extra)'],
  ['9', 'Popular o banco com dados fictícios'],
  ['0', 'Sair'],
];

let terminal = null;

/** Pergunta algo e devolve a resposta já sem espaços nas pontas. */
async function perguntar(texto) {
  const resposta = await terminal.question(texto);
  return resposta.trim();
}

/** Pergunta com valor padrão: Enter mantém o valor atual. */
async function perguntarComPadrao(rotulo, padrao) {
  const resposta = await perguntar(`  ${rotulo} [${padrao}]: `);
  return resposta === '' ? padrao : resposta;
}

function imprimirCabecalho(configuracao) {
  console.clear?.();
  console.log(LINHA);
  console.log('  CRUD ALUNOS — Firebase Cloud Firestore');
  console.log(LINHA);

  if (configuracao.ok) {
    console.log(`  ✔ ${configuracao.mensagem}`);
  } else {
    console.log('  ✖ Firebase não configurado.');
    console.log(configuracao.mensagem);
    console.log('  (o menu abre, mas as operações vão falhar até configurar)');
  }

  console.log(LINHA_FINA);
  for (const [tecla, descricao] of OPCOES) {
    console.log(`  ${tecla}) ${descricao}`);
  }
  console.log(LINHA);
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

async function acaoCadastrar() {
  console.log('\n--- NOVO ALUNO ---');
  const nome = await perguntar('  Nome: ');
  const turma = await perguntar('  Turma (ex.: 3A): ');
  const dataNascimento = await perguntar('  Data de nascimento (AAAA-MM-DD): ');
  const ativo = await perguntarComPadrao('Aluno ativo? (sim/não)', 'sim');

  const aluno = await alunosService.cadastrarAluno({ nome, turma, dataNascimento, ativo });

  console.log('\n  ✔ Aluno cadastrado com sucesso!');
  imprimirAluno(aluno);
}

async function acaoListar() {
  const alunos = await alunosService.listarAlunos();
  imprimirTabela(alunos, { titulo: '--- ALUNOS CADASTRADOS ---' });
}

async function acaoBuscarPorId() {
  const id = await perguntar('\n  ID do aluno: ');
  const aluno = await alunosService.buscarAlunoPorId(id);

  if (!aluno) {
    console.log(`  ✖ Nenhum aluno encontrado com o ID "${id}".`);
    return;
  }

  console.log('\n--- ALUNO ENCONTRADO ---');
  imprimirAluno(aluno);
}

async function acaoAtualizar() {
  const id = await perguntar('\n  ID do aluno que deseja atualizar: ');
  const atual = await alunosService.buscarAlunoPorId(id);

  if (!atual) {
    console.log(`  ✖ Nenhum aluno encontrado com o ID "${id}".`);
    return;
  }

  console.log('\n--- DADOS ATUAIS ---');
  imprimirAluno(atual);
  console.log('\n  (pressione Enter para manter o valor atual)\n');

  const nome = await perguntarComPadrao('Novo nome', atual.nome);
  const turma = await perguntarComPadrao('Nova turma', atual.turma);
  const dataNascimento = await perguntarComPadrao('Nova data de nascimento', atual.dataNascimento);
  const ativo = await perguntarComPadrao('Ativo? (sim/não)', atual.ativo ? 'sim' : 'não');

  const dados = {};
  if (nome !== atual.nome) dados.nome = nome;
  if (turma !== atual.turma) dados.turma = turma;
  if (dataNascimento !== atual.dataNascimento) dados.dataNascimento = dataNascimento;
  if (ativo !== (atual.ativo ? 'sim' : 'não')) dados.ativo = ativo;

  if (Object.keys(dados).length === 0) {
    console.log('\n  Nada foi alterado.');
    return;
  }

  const atualizado = await alunosService.atualizarAluno(atual.id, dados);

  console.log('\n  ✔ Aluno atualizado com sucesso!');
  imprimirAluno(atualizado);
}

async function acaoExcluir() {
  const id = await perguntar('\n  ID do aluno que deseja excluir: ');
  const aluno = await alunosService.buscarAlunoPorId(id);

  if (!aluno) {
    console.log(`  ✖ Nenhum aluno encontrado com o ID "${id}".`);
    return;
  }

  console.log('\n--- ALUNO QUE SERÁ EXCLUÍDO ---');
  imprimirAluno(aluno);

  const confirmacao = (await perguntar('\n  Confirmar exclusão? (s/n): ')).toLowerCase();
  if (confirmacao !== 's' && confirmacao !== 'sim') {
    console.log('  Operação cancelada.');
    return;
  }

  const removido = await alunosService.excluirAluno(aluno.id);
  console.log(`\n  ✔ Aluno "${removido.nome}" (ID ${removido.id}) excluído com sucesso.`);
}

async function acaoPorTurma() {
  const turma = await perguntar('\n  Turma: ');
  const alunos = await alunosService.listarAlunosPorTurma(turma);

  imprimirTabela(alunos, { titulo: `--- ALUNOS DA TURMA ${turma.trim().toUpperCase()} ---` });
}

async function acaoPorDataNascimento() {
  const data = await perguntar('\n  Data de nascimento (AAAA-MM-DD): ');
  const alunos = await alunosService.listarAlunosPorDataNascimento(data);

  imprimirTabela(alunos, { titulo: `--- ALUNOS NASCIDOS EM ${data.trim()} ---` });
}

async function acaoAniversariantes() {
  const mes = await perguntar('\n  Número do mês (1 a 12): ');
  const alunos = await alunosService.listarAniversariantesDoMes(mes);

  imprimirTabela(alunos, { titulo: `--- ANIVERSARIANTES DO MÊS ${Number(mes)} ---` });
}

async function acaoPopularDados() {
  const total = await alunosService.contarAlunos();
  if (total > 0) {
    const resposta = (await perguntar(`\n  Já existem ${total} aluno(s). Inserir os fictícios mesmo assim? (s/n): `)).toLowerCase();
    if (resposta !== 's' && resposta !== 'sim') {
      console.log('  Operação cancelada.');
      return;
    }
  }

  const { popularComDadosFicticios } = require('../services/seedService');
  const inseridos = await popularComDadosFicticios((aluno) => {
    console.log(`  + ${aluno.nome} (${aluno.turma}) -> ${aluno.id}`);
  });

  console.log(`\n  ✔ ${inseridos.length} aluno(s) fictício(s) inserido(s).`);
}

const ACOES = {
  '1': acaoCadastrar,
  '2': acaoListar,
  '3': acaoBuscarPorId,
  '4': acaoAtualizar,
  '5': acaoExcluir,
  '6': acaoPorTurma,
  '7': acaoPorDataNascimento,
  '8': acaoAniversariantes,
  '9': acaoPopularDados,
};

// ---------------------------------------------------------------------------
// Loop principal
// ---------------------------------------------------------------------------

async function iniciarMenu(configuracao = { ok: true, mensagem: '' }) {
  terminal = readline.createInterface({ input: stdin, output: stdout });

  try {
    let sair = false;

    while (!sair) {
      imprimirCabecalho(configuracao);
      const opcao = await perguntar('  Escolha uma opção: ');

      if (opcao === '0' || opcao.toLowerCase() === 'sair') {
        sair = true;
        break;
      }

      const acao = ACOES[opcao];
      if (!acao) {
        console.log(`\n  ✖ Opção inválida: "${opcao}".`);
        await perguntar('  Pressione Enter para continuar...');
        continue;
      }

      try {
        await acao();
      } catch (erro) {
        console.log(`\n  ✖ ${erro.message}`);
      }

      await perguntar('\n  Pressione Enter para voltar ao menu...');
    }

    console.log('\n  Até logo! 👋\n');
  } finally {
    terminal.close();
    terminal = null;
  }
}

module.exports = { iniciarMenu };
