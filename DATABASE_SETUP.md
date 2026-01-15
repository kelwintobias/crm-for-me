# Guia de Banco de Dados

## ✅ Estado Atual - Sincronizado

O banco de dados está **completamente sincronizado** com o código.

- ✅ Migration baseline criada (`0_init`)
- ✅ Sistema de agendamento implementado
- ✅ Todos os dados preservados (1.552 leads)

---

## 🚀 Para Iniciar o Projeto

```bash
npm run dev
```

**Pronto!** O projeto vai iniciar sem erros.

---

## 📋 Comandos do Prisma (Referência Futura)

### Quando você alterar o schema.prisma:

```bash
# 1. Criar e aplicar migration
npm run db:push

# OU (recomendado para produção)
npx prisma migrate dev --name descricao_da_mudanca
```

### Ver status das migrations:

```bash
npx prisma migrate status
```

### Ver o banco de dados visualmente:

```bash
npm run db:studio
```

---

## ⚠️ O que aconteceu (para referência)

**Problema:** Usamos `prisma db push` durante desenvolvimento, que atualiza o banco diretamente mas não cria histórico de migrations formais. Isso causou "drift detected".

**Solução aplicada:**

1. Criamos uma migration baseline do estado atual do banco:
   ```bash
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
   ```

2. Marcamos como já aplicada (já que o banco já tinha as tabelas):
   ```bash
   npx prisma migrate resolve --applied 0_init
   ```

3. Verificamos sincronização:
   ```bash
   npx prisma migrate status  # ✅ Database schema is up to date!
   ```

---

## 🔄 Workflow Recomendado Daqui pra Frente

### Durante Desenvolvimento:
```bash
# Fazer mudanças no schema.prisma
npx prisma migrate dev --name nome_da_mudanca
# Isso já faz: cria migration, aplica ao banco, gera Prisma Client
```

### Em Produção:
```bash
# Aplicar migrations pendentes
npx prisma migrate deploy
```

---

## 📊 Models no Banco

### Existentes antes:
- `User` - Usuários/vendedoras
- `Lead` - Leads do pipeline

### Novos (Sistema de Agendamento):
- `Appointment` - Agendamentos
- `AppointmentHistory` - Histórico de mudanças

### Enums:
- `LeadSource` - Origem do lead
- `PlanType` - Tipo de plano
- `PipelineStage` - Estágio do funil
- `UserRole` - Role do usuário
- `AppointmentStatus` - Status do agendamento (SCHEDULED, COMPLETED, CANCELED, NO_SHOW)
- `HistoryAction` - Ação no histórico (CREATED, RESCHEDULED, CANCELED, COMPLETED)

---

## 🎯 Dica Importante

**NUNCA** use `prisma migrate reset` em produção! Isso apaga TODOS os dados.

Use apenas em desenvolvimento local quando quiser resetar tudo do zero.

---

## 🆘 Se algo der errado

1. Verifique o status:
   ```bash
   npx prisma migrate status
   ```

2. Se houver drift novamente, rode:
   ```bash
   npx prisma migrate dev
   ```

3. Se nada funcionar, me chame! 😊
