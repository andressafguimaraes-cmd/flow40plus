# Configuração do Banco de Dados — Flow 40+

## Opção 1: Usar Planetscale (Recomendado - Gratuito)

### Passo 1: Criar conta no Planetscale
1. Acesse https://planetscale.com
2. Clique em "Get started"
3. Crie uma conta com email/senha ou GitHub
4. Confirme seu email

### Passo 2: Criar um banco de dados
1. No dashboard, clique em "Create a new database"
2. Nome: `flow40plus`
3. Region: Escolha a mais próxima de você
4. Clique em "Create database"

### Passo 3: Obter a connection string
1. Clique no banco `flow40plus`
2. Vá para "Connect"
3. Selecione "Node.js" na dropdown
4. Copie a connection string (começa com `mysql://`)

### Passo 4: Configurar o projeto
1. Abra o arquivo `.env.local` na raiz do projeto
2. Cole a connection string em `DATABASE_URL`
3. Exemplo:
```
DATABASE_URL=mysql://[username]:[password]@[host]/flow40plus
```

### Passo 5: Executar migrations
```bash
cd /home/ubuntu/flow40plus_app
pnpm run db:migrate
```

---

## Opção 2: Usar TiDB Cloud (Gratuito)

### Passo 1: Criar conta
1. Acesse https://tidbcloud.com
2. Crie uma conta com email ou GitHub
3. Confirme seu email

### Passo 2: Criar cluster
1. Clique em "Create Cluster"
2. Selecione "Serverless Tier" (gratuito)
3. Nome: `flow40plus`
4. Region: Escolha a mais próxima
5. Clique em "Create"

### Passo 3: Obter connection string
1. No cluster, clique em "Connect"
2. Copie a connection string MySQL
3. Exemplo:
```
mysql://[user]:[password]@[host]:4000/flow40plus
```

### Passo 4: Configurar e migrar
Mesmo processo da Opção 1.

---

## Opção 3: Usar Supabase (Gratuito)

### Passo 1: Criar conta
1. Acesse https://supabase.com
2. Clique em "Start your project"
3. Crie uma conta com GitHub ou email

### Passo 2: Criar projeto
1. Clique em "New project"
2. Nome: `flow40plus`
3. Database password: Guarde bem!
4. Region: Escolha a mais próxima
5. Clique em "Create new project"

### Passo 3: Obter connection string
1. Vá para "Project Settings" → "Database"
2. Copie a "Connection string" (modo URI)
3. Exemplo:
```
postgresql://postgres:[password]@[host]:5432/postgres
```

**Nota:** Supabase usa PostgreSQL, não MySQL. Se usar Supabase, será necessário ajustar o schema do Drizzle para PostgreSQL.

---

## Testando a conexão

Após configurar o `.env.local`, reinicie o servidor:

```bash
pkill -f "tsx"
cd /home/ubuntu/flow40plus_app
NODE_ENV=production npm run dev
```

Se a conexão estiver correta, você verá no console:
```
✅ Database connected successfully
```

---

## Troubleshooting

### "Connection refused"
- Verifique se a connection string está correta
- Verifique se você está usando a porta correta (MySQL: 3306, TiDB: 4000)
- Verifique se o firewall permite conexões

### "Access denied for user"
- Verifique username e password na connection string
- Verifique se o usuário tem permissão no banco

### "Database not found"
- Verifique se o banco `flow40plus` foi criado
- Verifique o nome do banco na connection string

---

## Próximos passos

Após configurar o banco de dados:

1. **Executar migrations** para criar as tabelas
2. **Testar o fluxo completo** (check-in, tarefas, etc)
3. **Implementar autenticação real** com OAuth
4. **Publicar o app** em produção
