# UpBoost CRM

CRM de vendas com pipeline Kanban para gestão de leads.

## Tecnologias

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** (Design System customizado)
- **Supabase** (Auth + PostgreSQL)
- **Prisma** (ORM)
- **@dnd-kit** (Drag & Drop)
- **Shadcn/ui** (Componentes)

## Configuração

### 1. Clonar e Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Vá em **Settings > API** e copie:
   - Project URL
   - Anon/Public Key

3. Vá em **Settings > Database** e copie a Connection String

4. **IMPORTANTE**: Vá em **Authentication > Providers > Email** e desabilite:
   - "Confirm email" (para criar usuários sem verificação)

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"
```

### 4. Configurar Banco de Dados

```bash
npx prisma db push
```

### 5. Criar Usuário Inicial

No dashboard do Supabase, vá em **Authentication > Users** e crie um usuário com email/senha.

### 6. Executar

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Funcionalidades

- **Login com Email/Senha** - Autenticação via Supabase
- **Kanban Board** - 5 colunas: Novos, Em Contato, Vendido Único, Vendido Mensal, Perdido
- **Drag & Drop** - Arraste leads entre colunas com atualização otimista
- **Dashboard** - Métricas em tempo real (Leads na Esteira, Vendas Únicas, Vendas Mensais)
- **Cadastro de Leads** - Nome, Telefone, Origem
- **Edição de Leads** - Plano de interesse, Notas
- **WhatsApp** - Botão de contato rápido via deep link

## Design System

| Cor | Código | Uso |
|-----|--------|-----|
| Azul Profundo | `#121724` | Background geral |
| Cinza Dark | `#262626` | Cards e painéis |
| Amarelo | `#FFD300` | Ações primárias |
| Branco | `#FFFFFF` | Títulos |
| Cinza Claro | `#A1A1AA` | Descrições |

## Scripts

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Executar produção
npm run lint     # Verificar código
npm run db:push  # Sincronizar schema do Prisma
npm run db:studio # Abrir Prisma Studio
```

## Estrutura do Projeto

```
src/
├── app/
│   ├── actions/      # Server Actions (leads, auth)
│   ├── auth/         # Callback OAuth
│   ├── login/        # Página de login
│   └── page.tsx      # Dashboard principal
├── components/
│   ├── dashboard/    # Métricas e view principal
│   ├── kanban/       # Board, colunas e cards
│   ├── layout/       # Header e UserMenu
│   ├── modals/       # NewLead e EditLead
│   └── ui/           # Componentes Shadcn
├── lib/
│   ├── prisma.ts     # Cliente Prisma
│   ├── supabase/     # Clientes Supabase (client/server)
│   └── utils.ts      # Funções utilitárias
├── types/            # Tipos TypeScript
└── middleware.ts     # Proteção de rotas
```

## Deploy

### Vercel

1. Conecte o repositório à Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

---

## Segurança 🔒

- **NÃO** comite o arquivo `.env` com chaves reais. Use variáveis de ambiente locais e **GitHub Secrets** para CI.  
- Configure segredos em: _Repository → Settings → Secrets and variables → Actions_.  
- Caso alguma chave vaze, revogue/roteie a chave imediatamente.

## CI / Checks ✅

Adicionei um workflow básico em `.github/workflows/ci.yml` que executa:
- Instalação de dependências (npm ci)
- Build (`npm run build`)
- Testes e lint quando presentes

Considere ativar proteções de branch (ex.: exigir checks) nas configurações do repositório.

Desenvolvido com base no PRD UpBoost CRM MVP v2
