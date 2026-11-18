# Como funciona (explicação didática)

Material de apoio para entender — e defender — o código da atividade.

---

## 1. O que é o Firestore

O Firestore é um banco de dados **NoSQL orientado a documentos**, do Firebase/Google Cloud.
Em vez de tabelas e linhas, ele guarda **documentos** (parecidos com objetos JSON) dentro de
**coleções**:

```
alunos                        ← coleção
├── aB3xY9...                 ← documento (ID gerado automaticamente)
│   ├── nome: "Ana Beatriz Souza"
│   ├── turma: "3A"
│   ├── dataNascimento: "2008-03-12"
│   ├── ativo: true
│   └── criadoEm: timestamp
└── kL7pQ2...
    └── ...
```

Cada documento tem um **ID único** dentro da coleção. É esse ID que usamos no READ por ID,
no UPDATE e no DELETE.

---

## 2. Por que o Firebase Admin SDK

Existem duas formas de falar com o Firestore:

| SDK | Onde roda | Autenticação | Regras de segurança |
| --- | --- | --- | --- |
| Client SDK (web/Android/iOS) | navegador, app | usuário logado | **obedece** às regras |
| **Admin SDK** (Node/Python/Java) | servidor, script | **conta de serviço** | **ignora** as regras |

A atividade pede o **Admin SDK**: o programa roda no seu computador como um "servidor" e se
autentica com a chave `serviceAccountKey.json` — por isso ele consegue ler e escrever mesmo
que as regras do Firestore estejam fechadas.

A inicialização fica em `src/config/firebase.js`:

```js
initializeApp({ credential: cert(jsonDaChave) }); // autentica com a conta de serviço
const banco = getFirestore();                     // devolve o cliente do Firestore
```

---

## 3. As operações do CRUD no código

Todas ficam em `src/services/alunosService.js`. O padrão é sempre o mesmo:
`obterDb()` devolve o Firestore, e a partir dele acessamos `collection('alunos')`.

### CREATE — `cadastrarAluno`

```js
const aluno = montarAluno(dados);           // valida e normaliza os 4 campos
const referencia = await colecao().add({    // add() GERA o ID automaticamente
  ...aluno,
  criadoEm: FieldValue.serverTimestamp(),   // data/hora do servidor
});
return { id: referencia.id, ...aluno };
```

`add()` é diferente de `set()`: `add()` cria um documento novo com ID aleatório;
`set()` escreve em um ID que você escolhe.

### READ — `listarAlunos` e `buscarAlunoPorId`

```js
// lista tudo
const snapshot = await colecao().get();
snapshot.docs.map(docParaAluno);            // converte cada documento em objeto simples

// um aluno específico
const documento = await colecao().doc(id).get();
documento.exists ? docParaAluno(documento) : null;
```

`docParaAluno()` existe porque o Firestore devolve um `DocumentSnapshot`, não um objeto
comum. Essa função junta `doc.id` com `doc.data()` e garante valores padrão.

### UPDATE — `atualizarAluno`

```js
const atualizacao = montarAtualizacao(dados);   // só os campos informados
await colecao().doc(id).update({
  ...atualizacao,
  atualizadoEm: FieldValue.serverTimestamp(),
});
```

`update()` altera **apenas os campos passados** — os outros continuam intactos.
(Se usássemos `set()` sem `{ merge: true }`, o documento seria substituído por inteiro.)

Antes de atualizar, o código busca o aluno. Se não existir, lança `ErroNaoEncontrado`
em vez de o Firestore criar um documento fantasma.

### DELETE — `excluirAluno`

```js
await colecao().doc(id).delete();
```

A exclusão é definitiva (não há lixeira no Firestore). Por isso o menu mostra os dados
do aluno e pede confirmação antes.

---

## 4. As consultas

```js
await colecao().where('turma', '==', '3A').get();
await colecao().where('dataNascimento', '==', '2008-03-12').get();
```

`where(campo, operador, valor)` filtra no servidor — só os documentos que atendem voltam.
Operadores possíveis: `==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `not-in`, `array-contains`.

Dois detalhes de projeto:

1. **Ordenação em memória.** Seria natural escrever
   `where('turma','==','3A').orderBy('dataNascimento')`, mas o Firestore exige um
   **índice composto** para combinar `where` + `orderBy` em campos diferentes — e isso
   quebraria a execução na primeira vez. Por isso o filtro é feito no banco e a ordenação
   por nome acontece no JavaScript (`ordenarPorNome`), com `localeCompare('pt-BR')` para
   respeitar acentos.

2. **Consulta por "mês".** O Firestore não sabe extrair o mês de uma string `AAAA-MM-DD`.
   A opção 8 (extra) baixa a lista e filtra em memória usando
   `dataNascimento.slice(4, 8) === '-03-'`. Em um sistema maior, valeria guardar um campo
   `mesNascimento` para consultar direto no banco.

---

## 5. Validação dos dados

Fica em `src/utils/validacao.js`, separada do banco. Ela garante que nada inválido chegue
ao Firestore:

- `nome`: remove espaços duplicados, exige de 3 a 120 caracteres.
- `turma`: remove espaços e converte para maiúsculas (`3a` → `3A`), para que
  `3A` e `3a` não virem turmas diferentes.
- `dataNascimento`: exige o formato `AAAA-MM-DD`, confere no calendário
  (`2007-02-29` é rejeitado) e recusa datas futuras.
- `ativo`: aceita `true/false` ou texto (`sim`, `s`, `1`, `não`, `n`, `0`…).

`montarAluno` monta o documento completo (CREATE) e `montarAtualizacao` monta apenas
o que mudou (UPDATE).

---

## 6. Estrutura e fluxo

```
index.js ──► verificarConfiguracao()  (a chave existe? o JSON é válido?)
   │
   └──► menu.js  (mostra o menu, lê o teclado)
            │
            ├── validação (utils/validacao.js)
            └── alunosService.js ──► config/firebase.js ──► Firestore
```

- `index.js`: ponto de entrada. Verifica a configuração e abre o menu.
- `menu.js`: interface com o usuário (entrada/saída). Não contém regra de negócio.
- `alunosService.js`: tudo que fala com o banco.
- `config/firebase.js`: inicialização do Admin SDK, busca da credencial e mensagens de erro.
- `ui/tabela.js`: formatação da saída em colunas.
- `scripts/seed.js` + `data/alunosFicticios.js`: carga inicial de dados fictícios.

Essa divisão é o que permite, por exemplo, criar uma **API REST** depois reutilizando
`alunosService.js` sem alterar nada nele.

---

## 7. Perguntas que o professor pode fazer

**O que acontece se eu cadastrar uma turma como "3a"?**
Ela é normalizada para `3A` antes de gravar, então cai na mesma consulta da turma `3A`.

**Por que o ID não é um campo do documento?**
O Firestore já usa o ID como nome do documento. Guardar dentro dele seria duplicação —
por isso `docParaAluno()` adiciona `id: doc.id` ao objeto retornado.

**O `serviceAccountKey.json` pode ir para o GitHub?**
Não. Ele autentica como conta de serviço e dá acesso total ao projeto. Está no `.gitignore`.
Se vazar, gere outra chave e revogue a antiga.

**O que é `FieldValue.serverTimestamp()`?**
Um marcador que o Firestore substitui pela hora oficial do servidor na hora da gravação,
evitando depender do relógio do computador.

**Como o programa trata erro de conexão?**
Cada ação do menu roda dentro de `try/catch`: a mensagem de erro é exibida e o menu
volta a aparecer, sem encerrar a aplicação.
