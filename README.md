# 📦 Pedidos de Camisas — Nossa Senhora do Rosário

Sistema de pedidos de camisas com painel administrativo.

---

## 🚀 PASSO A PASSO COMPLETO PARA PUBLICAR

### ETAPA 1 — Criar a tabela no Supabase

1. Acesse https://supabase.com e faça login
2. Abra seu projeto
3. No menu lateral clique em **SQL Editor**
4. Cole TODO o conteúdo do arquivo `supabase_setup.sql`
5. Clique em **Run** (▶️)
6. Deve aparecer "Success" — tabela criada!

---

### ETAPA 2 — Colocar o banner no projeto

1. Pegue a imagem do banner (arquivo `1775484751452_image.png`)
2. Renomeie para **`banner.jpg`**
3. Cole dentro da pasta **`public/`** do projeto

---

### ETAPA 3 — Subir para o GitHub

1. Acesse https://github.com e faça login
2. Clique em **New repository** (botão verde)
3. Dê o nome `pedidos-camisas`
4. Deixe **Private** (recomendado) ou Public
5. Clique em **Create repository**
6. Na página seguinte, copie os comandos que aparecem em
   "…or push an existing repository from the command line"

Se você ainda não tem o Git instalado, baixe em https://git-scm.com

No terminal (dentro da pasta do projeto), rode:

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/pedidos-camisas.git
git push -u origin main
```

---

### ETAPA 4 — Publicar no Vercel

1. Acesse https://vercel.com e faça login com sua conta GitHub
2. Clique em **Add New → Project**
3. Selecione o repositório `pedidos-camisas`
4. Clique em **Import**
5. Na seção **Environment Variables**, adicione:

   | Nome | Valor |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://uksnsiscbsblegqdenga.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (sua chave completa) |

6. Clique em **Deploy**
7. Aguarde ~2 minutos ☕
8. Seu site estará no ar com uma URL como `pedidos-camisas.vercel.app`

---

## 📁 Estrutura do Projeto

```
pedidos-camisas/
├── pages/
│   ├── _app.js          # App wrapper
│   ├── index.js         # Página principal (sistema completo)
│   └── api/
│       ├── pedidos.js        # GET todos / POST novo pedido
│       └── pedidos/[id].js   # PUT atualizar / DELETE remover
├── lib/
│   └── supabaseClient.js    # Conexão com Supabase
├── public/
│   └── banner.jpg           # ⚠️ VOCÊ PRECISA COLOCAR AQUI
├── styles/
│   └── globals.css
├── .env.local               # Variáveis locais (NÃO sobe pro GitHub)
├── .env.example             # Template sem segredos
├── .gitignore
├── next.config.js
├── package.json
└── supabase_setup.sql       # SQL para criar tabela
```

---

## ⚙️ Rodar localmente (opcional)

```bash
npm install
npm run dev
```

Acesse http://localhost:3000

---

## 🔑 Dados importantes

- **PIN Admin:** `3169`
- **Chave PIX:** `79988676777`
- **Preço por camisa:** R$ 55,00
