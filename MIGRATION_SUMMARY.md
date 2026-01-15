# Resumo da Migração de Colunas do Kanban

## O que foi alterado

### Colunas Antigas → Colunas Novas

1. **Novos** → **Novo Lead**
2. **Em Contato** → **Em Negociação**
3. **Vendido - Único** → **Finalizado**
4. **Vendido - Mensal** → **Finalizado**
5. **Perdido/Arquivado** → **Finalizado**

### Novas Colunas Adicionadas

3. **Agendado** - Para leads com avaliação agendada
4. **Em Atendimento** - Para leads em call no Discord
5. **Pós-Venda** - Para leads que já pagaram e estão no pós-venda

## Arquivos Modificados

### 1. Schema do Banco de Dados
- `prisma/schema.prisma` - Enum `PipelineStage` atualizado

### 2. Componentes do Frontend
- `src/components/kanban/kanban-board.tsx` - Array de stages atualizado
- `src/components/kanban/kanban-column.tsx` - Configuração de colunas e ícones
- `src/types/index.ts` - Labels e cores dos stages

### 3. Lógica de Negócio
- `src/app/actions/dashboard.ts` - Métricas e queries atualizadas para refletir:
  - **Vendidos**: Leads em "Pós-Venda" ou "Finalizado"
  - **Pipeline**: Leads em "Novo Lead", "Em Negociação" ou "Agendado"
  - **Em processo**: Leads em "Em Atendimento"

## Migração de Dados

### Estatísticas da Migração

Total de leads migrados: **1.552**

- 401 leads: NOVOS → NOVO_LEAD
- 292 leads: EM_CONTATO → EM_NEGOCIACAO
- 400 leads: VENDIDO_UNICO → FINALIZADO
- 276 leads: VENDIDO_MENSAL → FINALIZADO
- 183 leads: PERDIDO → FINALIZADO

### Distribuição Final

- **Finalizado**: 859 leads (55%)
- **Novo Lead**: 401 leads (26%)
- **Em Negociação**: 292 leads (19%)
- **Agendado**: 0 leads
- **Em Atendimento**: 0 leads
- **Pós-Venda**: 0 leads

## Próximos Passos

1. Testar o sistema em desenvolvimento
2. Verificar se todas as métricas do dashboard estão corretas
3. Validar o drag-and-drop do kanban
4. Confirmar se os filtros e relatórios funcionam corretamente

## Scripts de Migração Criados

- `prisma/migrate-stages.ts` - Script de migração de dados
- `prisma/check-stages.ts` - Script de verificação de stages
- `prisma/fix-remaining.ts` - Script para corrigir leads remanescentes

Esses scripts podem ser removidos após validação completa da migração.
