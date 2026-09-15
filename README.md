# Five Garage — Carros & Motos

Vitrine de anúncios de carros e motos. Frontend em React + Vite, backend em
[Supabase](https://supabase.com) (banco de dados, autenticação e storage de
fotos). Sem nenhuma dependência do Base44.

## Configurar o Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Abra **SQL Editor** no painel do projeto, cole o conteúdo de
   `supabase/schema.sql` e rode. Isso cria a tabela `vehicles`, as políticas
   de segurança (RLS) e o bucket de fotos `vehicle-photos`.
3. Em **Project Settings > API**, copie a **Project URL** e a chave
   **anon public**.
4. Copie `env.example.txt` para `.env.local` e preencha:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

### Login com Google (opcional)

Em **Authentication > Providers > Google**, ative o provedor e informe o
Client ID/Secret de um projeto no Google Cloud Console (OAuth consent
screen + credenciais OAuth 2.0, com a URL de callback que o Supabase mostra
nessa tela).

### Cadastro por código (OTP)

A tela de cadastro pede um código de 6 dígitos por e-mail. Para isso
funcionar, em **Authentication > Email Templates > Confirm signup**, inclua
`{{ .Token }}` no corpo do e-mail (por padrão o template do Supabase só traz
o link de confirmação, sem o código). Alternativa mais simples: trocar esse
fluxo por um link de confirmação — nesse caso me avise que eu ajusto a tela
de cadastro.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra a URL que o Vite mostrar (normalmente `http://localhost:5173`).

## Publicar anúncios é só para administradores

Qualquer pessoa pode navegar pelos anúncios sem estar logada. Só publicar
(ou editar/apagar) um anúncio é restrito a contas marcadas como
administrador — a política de segurança do banco (RLS) já exige isso, então
não dá para burlar direto pela API. Quem não é administrador (logado ou
não) vê um convite para falar pelo WhatsApp em vez do formulário de anúncio.

**Para tornar alguém administrador:**

1. Essa pessoa cria uma conta pelo site, na tela "Criar conta" (`/register`).
2. No painel do Supabase, em **SQL Editor**, rode (trocando o e-mail):
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
   ```
3. Pronto — da próxima vez que essa pessoa entrar em `/login`, o site mostra
   o botão "Publicar novo anúncio" em vez do convite do WhatsApp.

Não existe um link de "Entrar" visível no menu (a maioria dos visitantes
não precisa dele) — a equipe acessa pelo link discreto "Área administrativa"
no rodapé, ou direto por `/login`.

## Logo

As imagens da logo estão em `public/`:

- `logo-mark.jpg` — só o emblema (carro + moto), usado pequeno na navbar e
  no rodapé, ao lado do nome "FIVE GARAGE" em texto.
- `logo-lockup.jpg` — emblema + "FIVE GARAGE" por extenso, usado grande na
  seção principal (hero).
- `logo-full.jpg` — a imagem original completa, usada na prévia de
  compartilhamento (`og:image`) quando o link do site é enviado no
  WhatsApp/redes sociais.

Para trocar por uma versão nova da logo, é só substituir esses três
arquivos em `public/` (mantendo os mesmos nomes) ou editar
`src/components/Logo.jsx`.

## Estrutura

- `src/pages` — páginas (Home, Login, Register, recuperação de senha).
- `src/components` — componentes de UI e de domínio (cartão de veículo,
  formulário de anúncio).
- `src/components/ui` — componentes de interface reutilizáveis (botão,
  input, toast etc.), no padrão shadcn/ui.
- `src/lib` — client do Supabase e funções de acesso a dados
  (`vehicles.js`, `auth.js`).
- `supabase/schema.sql` — schema do banco, políticas de segurança e bucket
  de fotos.
