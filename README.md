# Cultive-Mobile

Extensão de campo do **Cultive+**. Compartilha o mesmo back-end e banco de dados do sistema web,
mas mantém um banco **SQLite próprio no aparelho** para funcionar sem internet (offline-first).
O que o operador registra na lavoura fica guardado localmente e sobe automaticamente assim que
houver conexão.

## Como executar

```bash
npm install
npx expo start        # ou: npx expo start -c  (limpa cache e redefine rotas)
```

Escolha a plataforma: Expo Go no celular/tablet, ou Web pelo link do localhost.

## Conectando ao back-end

O app precisa alcançar a API Spring Boot (`cultivamais`, porta **8090**).

- **No Expo Go**, o endereço é deduzido automaticamente do IP do Metro — normalmente funciona sem
  configuração, desde que celular e computador estejam na mesma rede Wi-Fi.
- Para fixar manualmente, edite `expo.extra.apiUrl` no `app.json`:

  ```json
  "extra": { "apiUrl": "http://192.168.0.100:8090/api" }
  ```

`localhost` **não** funciona no aparelho físico — ele aponta para o próprio celular.

O back-end já libera CORS para `localhost`, `192.168.*` e `10.*` (necessário apenas no Expo Web;
o app nativo não passa por CORS).

## Arquitetura

```
app/screens/         telas (login + 5 abas + telas do perfil)
app/routes/          navegação: stack (login ↔ app) e bottom tabs
components/          UI compartilhada (cartões, etiquetas, seletor, cabeçalho)
contexts/            AuthContext (sessão) e SyncContext (estado da sincronização)
database/            SQLite: schema, migrações e repositórios
services/            cliente HTTP, autenticação e tradução da API
sync/                motor de sincronização (outbox → servidor → banco local)
hooks/               conectividade e hooks de dados (React Query sobre SQLite)
theme/               tokens visuais
```

### Offline-first

- O **SQLite é a fonte da verdade**: toda tela lê do banco local, nunca direto da rede.
- Alterações feitas no campo entram na tabela `outbox` e são aplicadas na hora na interface.
- A sincronização **sobe primeiro** (outbox) e **baixa depois** — o contrário sobrescreveria o
  trabalho do operador com dados antigos.
- Registros criados sem internet recebem id negativo temporário, trocado pelo id real do servidor
  no momento do envio.
- Para evoluir o schema: acrescente uma migração em `database/schema.ts` e incremente
  `DATABASE_VERSION`. Nunca edite uma migração já publicada.

### Login

Não há tela de cadastro — as credenciais são as mesmas criadas pelo administrador no sistema web.
No primeiro acesso é preciso ter internet; depois disso a sessão persiste no aparelho e o login
funciona offline. As credenciais ficam no SecureStore (Android Keystore / iOS Keychain) para
revalidar o acesso sem rede e renovar o token, que expira em 24 h no back-end.

## Escopo

O app **não** replica o sistema web — é a visão de campo:

| Tela | O que faz |
|---|---|
| Cultivos | Acompanha e altera estágio/sanidade. **Não cadastra** cultivos. |
| Estoque | CRUD completo, com busca e filtros por categoria/subcategoria. |
| Tarefas | Executa tarefas (conclusão, observação com foto, insumos). **Não cria** tarefas. |
| Relatórios | Consulta 4 tópicos a partir do cache local. |
| Perfil | Dados pessoais, segurança, preferências, notificações, sair. |

## Verificação

```bash
npm run typecheck     # checagem de tipos
```
