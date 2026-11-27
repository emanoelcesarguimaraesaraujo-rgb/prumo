# Guia completo — publicar e atualizar o Prumo com GitHub + Cloudflare

Este guia parte do pacote integrado do Prumo. A ordem recomendada é: **D1 → Worker → landing/Mesa no GitHub → Cloudflare Pages → teste final**.

> Você não precisa usar Base44 para publicar esta versão. O projeto já é HTML/CSS/JavaScript e o backend foi preparado para Cloudflare Workers + D1 + Workers AI. GitHub guarda os arquivos; Cloudflare executa o backend e hospeda o site.

## 0. O que cada serviço faz

- **GitHub:** guarda o código e o histórico das alterações.
- **Cloudflare Pages:** publica `index.html`, `mesa.html`, `pet/` e os outros arquivos estáticos.
- **Cloudflare Worker:** executa a API de login, cadastro, créditos e chatbot.
- **Cloudflare D1:** guarda as contas online e o consumo diário de créditos.
- **Workers AI:** executa o modelo generativo. Não precisa de uma chave OpenAI no navegador nem no Worker.

O modelo padrão configurado é `@cf/zai-org/glm-4.7-flash`. A Cloudflare documenta esse modelo como disponível em Workers AI e lista a família GLM-4.7-Flash entre as opções do plano gratuito. O Workers AI possui uma franquia compartilhada de 10.000 Neurons por dia no plano gratuito; ao exceder a franquia, o comportamento depende do plano e da cobrança habilitada. Consulte a página de preços antes de ampliar o uso.

## 1. Preparar os arquivos no Windows

1. Baixe o ZIP final recebido.
2. No Explorador de Arquivos, clique com o botão direito no ZIP.
3. Escolha **Extrair Tudo**.
4. Abra a pasta extraída `Prumo-atualizado`.
5. Confira se aparecem `index.html`, `mesa.html`, `pet`, `cloudflare`, `README.md` e este guia.
6. Não envie o ZIP fechado para o GitHub como se fosse o site. O GitHub precisa receber os arquivos extraídos.
7. Guarde uma cópia da versão antiga antes de substituir qualquer coisa.

## 2. Criar ou atualizar o repositório GitHub

### Opção A — mais segura: GitHub Desktop (recomendado no Windows)

1. Instale o GitHub Desktop pelo site oficial `https://desktop.github.com/`.
2. Abra o programa e entre na sua conta GitHub.
3. Se o repositório do Prumo já existe, escolha **File → Clone repository** e clone-o para o computador. Se ainda não existe, crie um repositório no GitHub e depois clone.
4. No GitHub Desktop, use **Repository → Show in Explorer** para abrir a pasta local do repositório.
5. Faça uma cópia de segurança dessa pasta ou crie uma branch antes de substituir arquivos.
6. Abra a pasta `Prumo-atualizado` extraída do ZIP.
7. Copie o conteúdo dela — os arquivos e pastas que estão dentro dela, não a pasta ZIP — para a pasta local do repositório.
8. Quando o Windows perguntar, escolha **Substituir os arquivos no destino**.
9. Não apague a pasta oculta `.git` do repositório. Ela é controlada pelo GitHub Desktop.
10. Se o repositório tiver arquivos antigos que não existem mais no pacote novo, o GitHub Desktop mostrará esses arquivos como removidos. Confira com cuidado antes de confirmar.
11. Volte ao GitHub Desktop. Revise a lista de alterações.
12. No campo **Summary**, escreva `Atualiza Prumo: chatbot híbrido e Cloudflare AI`.
13. Clique em **Commit to main** (ou na branch de trabalho) e depois em **Push origin**.
14. Abra o repositório no navegador e confira se `index.html`, `mesa.html`, `pet/` e `cloudflare/` aparecem na raiz.

Se você usar uma branch diferente de `main`, só faça merge nela depois de conferir a prévia.

### Opção B — pelo navegador do GitHub

1. Entre em `https://github.com/` e abra o repositório do Prumo.
2. Faça primeiro um backup: use **Code → Download ZIP** ou crie uma branch de segurança.
3. Na página principal do repositório, clique em **Add file → Upload files**.
4. Arraste os arquivos extraídos do pacote para a área de upload. Se o navegador não preservar as pastas, crie as pastas no GitHub e envie os arquivos correspondentes, mantendo os caminhos `pet/` e `cloudflare/`.
5. Quando um arquivo tiver o mesmo caminho e nome de outro existente, o GitHub registrará a nova versão.
6. Revise a lista de arquivos antes de confirmar.
7. Escreva uma mensagem de commit, por exemplo `Atualiza Prumo integrado`.
8. Clique em **Commit changes**.
9. Atenção: enviar arquivos novos não apaga automaticamente arquivos antigos que deixaram de fazer parte do projeto. Compare a estrutura e remova manualmente somente os arquivos antigos que você tiver certeza de que não são mais necessários.

**Nunca envie** `.env`, tokens, senhas, `JWT_SECRET` ou chaves privadas ao GitHub.

## 3. Criar o banco de dados D1

1. Entre no painel `https://dash.cloudflare.com/`.
2. No menu, abra **Workers & Pages**.
3. Acesse **D1 SQL Database** (em algumas telas, D1 aparece na seção Storage & databases).
4. Clique em **Create database**.
5. Dê o nome `prumo-db` e crie o banco.
6. Abra o banco criado e localize a área **Console** ou **Query**.
7. Abra no computador o arquivo `cloudflare/schema.sql`.
8. Copie todo o conteúdo SQL e cole no Console do D1.
9. Execute o script.
10. Confira se as tabelas `users` e `daily_usage` foram criadas.
11. Copie o **Database ID** mostrado nos detalhes do banco. Guarde-o; ele será usado no Wrangler se você publicar pelo terminal.

**Se você já tinha um banco antigo:** não execute migrações às cegas. O esquema desta versão usa a coluna `password_salt`. Um backend experimental anterior pode ter usado `salt`. Se já existem contas e dados reais no D1, faça backup e confirme a estrutura da tabela `users` antes de alterar o banco. Se ainda não há usuários reais, criar um D1 novo chamado `prumo-db` é o caminho mais simples.

## 4. Criar e configurar o Worker

### 4.1 Criar o Worker

1. No painel Cloudflare, abra **Workers & Pages**.
2. Clique em **Create application** e escolha **Worker**.
3. Crie um Worker com o nome `prumo-api`.
4. Depois da criação, abra o Worker e escolha **Edit code**.
5. No seu computador, abra `cloudflare/worker.js` em um editor de texto.
6. Copie o arquivo inteiro e substitua o código de exemplo no editor da Cloudflare.
7. Clique em **Deploy**.

### 4.2 Vincular o D1

1. No Worker `prumo-api`, abra **Settings → Bindings**.
2. Clique em **Add binding** e escolha **D1 database**.
3. No campo de variável/binding name, escreva exatamente `DB`.
4. Selecione o banco `prumo-db`.
5. Salve as alterações e faça deploy se o painel solicitar.

### 4.3 Vincular Workers AI

1. Ainda em **Settings → Bindings**, clique em **Add binding**.
2. Escolha **Workers AI**.
3. No nome da variável, escreva exatamente `AI`.
4. Salve.
5. Faça deploy novamente, se solicitado.

O nome precisa ser `AI`, porque o código chama `env.AI.run(...)`.

### 4.4 Criar o segredo JWT_SECRET

Esse segredo assina as sessões de login. Não é uma chave de IA.

No Windows PowerShell, você pode gerar uma sequência aleatória com o comando abaixo:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

1. Copie o resultado gerado.
2. No painel do Worker, abra **Settings → Variables and Secrets**.
3. Adicione uma variável do tipo **Secret** com o nome `JWT_SECRET`.
4. Cole o valor gerado e salve.
5. Não coloque esse valor no `mesa.html`, no GitHub, em prints ou em mensagens públicas.

### 4.5 Configurar as variáveis normais

Em **Settings → Variables and Secrets**, adicione estas variáveis de texto:

| Nome | Valor |
|---|---|
| `AI_MODEL` | `@cf/zai-org/glm-4.7-flash` |
| `DAILY_CREDITS` | `2` |
| `APP_TIME_ZONE` | `America/Fortaleza` |
| `ALLOWED_ORIGINS` | deixe para preencher depois de publicar o site |

Não crie `OPENAI_API_KEY` para o chatbot. Esta versão não precisa dela.

## 5. Testar o Worker antes de publicar o site

1. Abra o Worker `prumo-api` e copie a URL pública, que termina normalmente em `.workers.dev`.
2. Abra no navegador a URL seguida de `/api/health`, por exemplo:

```text
https://prumo-api.SEU-SUBDOMINIO.workers.dev/api/health
```

3. A resposta deve ser um JSON com `ok: true`, `service: "prumo-api"` e `ai: true`.
4. Se `ai` aparecer como `false`, confira o binding `AI`.
5. Se aparecer erro de D1, confira o binding `DB` e se o schema foi executado.

## 6. Configurar a URL do Worker no site

1. Abra `mesa.html` no editor de texto.
2. Procure a linha próxima ao início do arquivo:

```html
<script>window.PRUMO_CONFIG = { apiUrl: "https://SUBSTITUA-PELA-URL-DO-WORKER.workers.dev" };</script>
```

3. Troque apenas a URL de exemplo pela URL real do seu Worker, sem acrescentar `/api` no final. Exemplo:

```html
<script>window.PRUMO_CONFIG = { apiUrl: "https://prumo-api.seu-subdominio.workers.dev" };</script>
```

4. Salve o arquivo.
5. Substitua a versão de `mesa.html` no repositório GitHub pelo arquivo atualizado.
6. Faça commit e push. O Cloudflare Pages fará outro deploy se estiver conectado ao GitHub.

## 7. Publicar a landing page e a Mesa no Cloudflare Pages

### Se o Pages já está conectado ao GitHub

1. Abra **Workers & Pages** no painel Cloudflare.
2. Selecione o projeto Pages do Prumo.
3. Abra **Deployments**.
4. Aguarde a implantação do commit mais recente.
5. Abra a URL `pages.dev` e teste a landing page e a Mesa.

### Se ainda não conectou o GitHub ao Pages

1. Abra **Workers & Pages → Create application → Pages**.
2. Escolha **Connect to Git**.
3. Autorize a integração com GitHub.
4. Selecione o repositório do Prumo.
5. Escolha a branch de produção, normalmente `main`.
6. Como este projeto é HTML/CSS/JS puro, use uma configuração simples:
   - Framework preset: `None`.
   - Build command: `exit 0`.
   - Build output directory: `.` (raiz do repositório, onde estão `index.html` e `mesa.html`).
7. Clique em **Save and Deploy**.
8. Quando terminar, abra o domínio `*.pages.dev` fornecido.

A integração Git publica uma nova versão automaticamente quando você envia alterações para a branch de produção. A Cloudflare também cria prévias para branches que não são a branch de produção.

## 8. Ajustar CORS depois de descobrir o domínio do site

Depois que o Pages estiver publicado:

1. Copie o domínio exato do site, por exemplo `https://prumo.pages.dev`.
2. Volte ao Worker `prumo-api`.
3. Em **Settings → Variables and Secrets**, defina `ALLOWED_ORIGINS` com o domínio exato, sem barra no final.
4. Se também usar domínio próprio, separe os domínios por vírgula, por exemplo:

```text
https://prumo.pages.dev,https://www.seudominio.com.br
```

5. Salve e faça deploy do Worker.

Durante o primeiro teste, se a variável não estiver definida, o Worker aceita origens amplas. Para a publicação final, prefira restringir aos domínios reais do Prumo.

## 9. Teste completo do Prumo

1. Abra a landing page.
2. Entre na Mesa.
3. Crie uma conta online com nome, e-mail e senha de pelo menos 10 caracteres.
4. Saia e entre novamente para confirmar o login.
5. Abra o assistente. A abertura não deve consumir crédito.
6. Pergunte: `Quantas mensagens posso enviar por dia?` A resposta deve vir da FAQ e o saldo cair de 2/2 para 1/2.
7. Pergunte algo aberto, como `Crie três ideias de campanha para uma cafeteria que quer divulgar seu brunch de domingo`. A resposta deve vir do Workers AI e o saldo cair para 0/2.
8. Envie uma terceira mensagem. O servidor deve bloquear com limite diário atingido.
9. Digite `/pet`. O Pru deve reaparecer sem gastar crédito.
10. Use **Suma**. O Pru deve desaparecer com partículas de poeira e continuar oculto após atualizar a página, até usar `/pet`.

Se o chat falhar, consulte **Workers & Pages → prumo-api → Logs**. O endpoint `/api/health` informa se o binding AI está conectado, mas não substitui o teste real de geração.

## 10. Como atualizar o Prumo no futuro

1. Baixe ou clone a versão atual do repositório.
2. Faça uma cópia de segurança.
3. Edite os arquivos localmente.
4. Abra o GitHub Desktop, revise as alterações, faça commit e **Push origin**.
5. O Pages publicará a nova versão automaticamente.
6. Se você alterou `cloudflare/worker.js`, publique também o Worker: pelo painel, substitua o código e clique em Deploy; ou use Wrangler conforme a seção abaixo.
7. Se alterou `schema.sql`, planeje uma migração D1 separada. Não execute novamente um SQL de criação esperando que ele modifique tabelas já existentes.

## 11. Publicar o Worker com Wrangler (alternativa para quem já usa terminal)

Use esta opção se quiser publicar o backend diretamente a partir da pasta `cloudflare`.

1. Instale Node.js LTS pelo site oficial `https://nodejs.org/`.
2. Abra o PowerShell na pasta `cloudflare` do projeto.
3. Instale/execute Wrangler:

```powershell
npx wrangler login
npx wrangler whoami
```

4. Edite `wrangler.toml` e substitua `PREENCHER_COM_O_ID_REAL_DO_D1` pelo Database ID do seu D1.
5. Confira se os nomes dos bindings no arquivo são `DB` e `AI`.
6. Publique:

```powershell
npx wrangler deploy
```

7. Cadastre o segredo sem escrevê-lo no arquivo:

```powershell
npx wrangler secret put JWT_SECRET
```

O terminal solicitará o valor. Cole o segredo e confirme.
8. Configure variáveis, se necessário, no painel ou em `[vars]` do Wrangler. Não coloque segredos em `[vars]`.

Não use o deploy via Wrangler e o editor web ao mesmo tempo sem saber qual versão está ativa; ambos atualizam o mesmo Worker.

## 12. E se eu quiser usar Base44?

Base44 é uma plataforma diferente: oferece hospedagem, banco, autenticação e funções de backend gerenciadas, além de integração com GitHub em determinados planos. Ela pode ser interessante se a intenção for reconstruir o Prumo usando os serviços próprios da Base44.

Para esta versão, porém, **recomendo GitHub + Cloudflare Pages + Worker + D1 + Workers AI**. O código já foi preparado para esses serviços. Levar o Prumo para Base44 não é apenas “subir o mesmo ZIP”: seria necessário validar a hospedagem dos arquivos, decidir se mantém o Worker externo ou migra autenticação, banco e funções para o backend Base44, e adaptar integrações. Isso adiciona trabalho e pode introduzir limites/créditos de outra plataforma.

Se optar por Base44 mais tarde, mantenha o repositório GitHub como backup e faça a migração como um projeto separado. Não conecte uma aplicação Base44 ao mesmo repositório e permita sobrescritas sem backup, porque o formato e a estrutura podem ser diferentes.

## 13. Limitações conhecidas desta versão

- A cota de 2 créditos é por conta e por dia, controlada pelo D1. A franquia de Workers AI é uma cota separada da conta Cloudflare.
- O limite de 2 mensagens não garante que todas as chamadas sejam gratuitas: se a franquia diária de Neurons da Cloudflare for excedida, a geração pode falhar até a renovação ou mudança de plano.
- A ferramenta de geração de imagens do Editor é separada e ainda pode exigir endpoint e chave de outro provedor. Não é coberta pela integração do chatbot.
- Os dados de trabalho da Mesa continuam no navegador nesta versão; contas e créditos online ficam no D1. Faça backup dos dados locais.
- O código foi preparado e passou por verificações locais de sintaxe. A implantação real, a criação de conta na sua Cloudflare e os testes de ponta a ponta dependem de executar os passos deste guia na sua conta.
