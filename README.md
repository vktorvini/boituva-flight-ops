# 🪂 Boituva Flight Ops

Sistema de decisão de voo baseado em clima para **Balonismo** e **Paraquedismo** em Boituva–SP.

---

## Stack

| Camada    | Tecnologia                          |
|-----------|-------------------------------------|
| Backend   | Python · FastAPI · SQLAlchemy       |
| Banco     | PostgreSQL                          |
| Frontend  | Next.js · TypeScript · TailwindCSS  |
| Dados     | Open-Meteo (gratuito, sem API key)  |

---

## Outputs

| Status       | Condição                                      |
|--------------|-----------------------------------------------|
| ✅ SEGURO     | Vento ≤15, Rajada ≤20, Sem chuva              |
| ⚠️ ATENÇÃO   | Vento 15–20 **ou** Rajada 20–25               |
| 🚫 PROIBIDO  | Vento >20 **ou** Rajada >25 **ou** Chuva >0   |

---

## Rodar em Desenvolvimento

### 1. PostgreSQL

```bash
docker run -d \
  --name boituva-db \
  -e POSTGRES_DB=boituva_ops \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # edite se necessário
uvicorn app.main:app --reload --port 8000
```

Acesse: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install

cp .env.example .env.local         # edite se necessário
npm run dev
```

Acesse: http://localhost:3000

---

## Rodar com Docker Compose

```bash
# Configure os .env
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Suba tudo
docker compose up --build
```

| Serviço  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:3000     |
| API      | http://localhost:8000     |
| Docs API | http://localhost:8000/docs|

---

## Endpoints API

| Método | Rota             | Descrição                    |
|--------|------------------|------------------------------|
| GET    | /clima/atual     | Dados meteorológicos atuais  |
| GET    | /voo/status      | Status SAFE/WARNING/PROIBIDO |
| GET    | /voo/janela      | Previsão horária 48h         |
| GET    | /voo/historico   | Histórico de registros       |
| GET    | /health          | Health check                 |

---

## Páginas Frontend

| Rota        | Página                      |
|-------------|------------------------------|
| `/`         | Status atual + métricas      |
| `/janela`   | Timeline 48h                 |
| `/grafico`  | Gráficos de vento/chuva      |
| `/historico`| Tabela de histórico          |

---

## Atualização Automática

- Backend busca dados a cada **5 minutos** automaticamente
- Frontend recarrega status a cada **60 segundos**
- Dados: [Open-Meteo](https://open-meteo.com) — gratuito, sem chave

---

## Pasta no Windows

Coloque em: `C:\Users\Vktor\Boituva Clima\boituva-flight-ops`
