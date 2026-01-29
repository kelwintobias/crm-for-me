# UpBoost CRM

CRM de vendas moderno com pipeline Kanban, gestão de contratos e métricas financeiras em tempo real.

## 🚀 Tecnologias

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) (Design System customizado)
- **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM:** [Prisma](https://www.prisma.io/)
- **Drag & Drop:** [@dnd-kit](https://dndkit.com/)
- **UI Components:** [Shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Gráficos:** [Recharts](https://recharts.org/)

## ✨ Funcionalidades Principais

- **Dashboard Financeiro:**
  - Métricas KPIs (MRR, Ticket Médio, Receita Total).
  - Gráficos de distribuição de vendas, leads por origem e funil de conversão.
  - **Cores Dinâmicas:** Gráficos com paleta de cores vibrante e mapeamento consistente.

- **Gestão de Contratos:**
  - Criação e edição de contratos.
  - **Override Manual de Valor:** Capacidade de editar manualmente o valor total do contrato, ignorando o cálculo automático (pacote + addons).
  - Geração automática de parcelas e controle de inadimplência.

- **Pipeline Kanban:**
  - Colunas personalizáveis (Novo Lead, Em Negociação, Agendado, etc.).
  - Drag & Drop com persistência de estado.

- **Agenda e Webhooks:**
  - Integração com Evolution API para mensagens.
  - Agendamento de reuniões com validação de horário comercial.

## 🛠️ Configuração do Ambiente

### 1. Clonar e Instalar

```bash
git clone https://github.com/kelwintobias/crm-for-me.git
cd crm-for-me
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha as chaves:

```env
# Banco de Dados (Supabase Transaction Pooler)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"

# Banco de Dados Direto (Supabase Direct Connection - para migrações)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase Client
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"

# API de Mensagens (Opcional)
EVOLUTION_API_URL="https://api.seudominio.com"
EVOLUTION_API_TOKEN="[TOKEN]"
```

### 3. Banco de Dados

Sincronize o schema do Prisma com o banco de dados:

```bash
npx prisma db push
# OU para criar migrações
npx prisma migrate dev
```

### 4. Executar em Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Estrutura do Projeto

```
src/
├── app/
│   ├── actions/          # Server Actions (Lógica de Backend)
│   │   ├── contracts.ts  # Gestão de contratos (inclui override de valor)
│   │   ├── dashboard.ts  # Métricas e agregações
│   │   └── leads.ts      # Manipulação de leads
│   ├── api/              # API Routes (Webhooks)
│   └── page.tsx          # Dashboard Principal
├── components/
│   ├── dashboard/        # Gráficos e Widgets (Recharts)
│   │   ├── sales-distribution-chart.tsx
│   │   └── conversion-funnel.tsx
│   ├── modals/           # Modais de Interação
│   │   ├── new-contract-modal.tsx      # Criação (+ edição manual)
│   │   └── edit-contract-value-modal.tsx # Edição de valor pós-criação
│   └── kanban/           # Quadro de Leads
├── lib/
│   ├── prisma.ts         # Instância do Prisma Client
│   └── utils.ts          # Helpers (formatação de moeda, datas)
└── styles/               # CSS Global
```

## 🐛 Solução de Problemas Comuns

### ChunkLoadError
**Sintoma:** O navegador exibe `ChunkLoadError` ao navegar entre páginas (ex: Tabela de Devedores).
**Causa:** Incompatibilidade temporária entre os arquivos compilados no servidor e o cache do navegador durante o desenvolvimento (Hot Reload).
**Solução:**
1. Pare o servidor (`Ctrl + C`).
2. Rode `npm run dev` novamente.
3. Recarregue a página com `Ctrl + F5`.

### Cores dos Gráficos Sumindo
**Causa:** O Tailwind CSS pode "limpar" (purge) classes de cores geradas dinamicamente se elas não estiverem explícitas no código.
**Solução:**
- Use atributos `style={{ fill: "#HEX" }}` diretamente nos componentes do Recharts ou mapeie cores usando constantes hexadecimais explícitas em vez de classes utilitárias constuídas via string (ex: `bg-${color}-500`).

### Erro de Serialização (Decimal)
**Sintoma:** Erro ao passar dados do Prisma para Componentes Cliente (`Decimal` não é serializável).
**Solução:** Converta campos `Decimal` para `number` ou `string` nas Server Actions antes de retornar os dados.
```typescript
totalValue: Number(contract.totalValue) // Exemplo
```

## 📦 Scripts Disponíveis

```bash
npm run dev       # Ambiente de desenvolvimento
npm run build     # Build de produção
npm run start     # Executar build de produção
npm run lint      # Checagem de código (ESLint)
npm run db:studio # Interface visual do banco de dados (Prisma Studio)
```

## 🔐 Segurança e Deploy

- NUNCA comite o arquivo `.env` ou `.env.local`.
- Utilize **GitHub Secrets** para configurar variáveis de ambiente no CI/CD.
- Para deploy na Vercel: Configure as variáveis de ambiente no painel do projeto e conecte o repositório GitHub.

---
Desenvolvido por [Seu Nome/Time]
