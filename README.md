# 🪂 Boituva Flight Ops v2

Sistema de decisão de voo baseado em clima para **Balonismo** e **Paraquedismo** em Boituva–SP. A versão 2 foca em segurança operacional, inteligência meteorológica e visualização profissional.

---

## 🚀 Novidades na V2

- **Integração Multi-Fonte (Worst-Case Consensus)**: O motor agora consulta simultaneamente Open-Meteo, Met Norway, NOAA (modelo GFS) e cruza com o histórico do INMET. O sistema de decisão sempre assume o *pior cenário* entre as fontes para garantir total segurança operacional.
- **Visualização Cartográfica com Windy**: O novo mapa operacional conta com duas camadas: um Heatmap de Risco desenvolvido nativamente e um motor visual de fluxo de ventos integrado diretamente ao mapa profissional do Windy.
- **Bússola de Vento em Tempo Real**: Componente React customizado (`WindCompass`) com renderização em tempo real das direções magnéticas do vento e velocidade máxima de rajadas.
- **Theme Switcher Global**: Suporte transparente a Dark Mode e Light Mode persistidos no `localStorage`.
- **Módulo de Analytics Preditivo**: Dashboards de estatísticas e gráficos históricos projetados para facilitar a previsão das janelas de voo ao longo dos dias.
- **Hardening de Segurança e Deploy**: Senhas e credenciais blindadas no Supabase com variáveis ambientais seguras.

---

## 🏗 Stack e Arquitetura

O sistema é moldado em torno do padrão de **Agentes de Dados**, onde agentes autônomos ingerem, processam e validam as condições meteorológicas de forma agnóstica.

| Camada    | Tecnologia                                  |
|-----------|---------------------------------------------|
| Backend   | Python 3.11+ · FastAPI · SQLAlchemy         |
| Banco     | Supabase (PostgreSQL 15+)                   |
| Frontend  | Next.js 14 · TypeScript · TailwindCSS       |
| Dados     | Open-Meteo, Met Norway, NOAA, INMET         |

---

## 🚦 Motor de Decisão (Consensus Engine)

| Status       | Condição (Baseada na métrica mais severa de todas as fontes)  |
|--------------|---------------------------------------------------------------|
| ✅ SEGURO     | Vento ≤12km/h, Rajada ≤15km/h, Sem chuva                      |
| ⚠️ ATENÇÃO   | Vento >12km/h **ou** Rajada >15km/h                           |
| 🚫 PROIBIDO  | Vento >22km/h **ou** Rajada >30km/h **ou** Chuva > 0mm        |

*(Nota: Os limites são customizáveis via variáveis no Decision Engine e levam em conta fatores de instabilidade).*

---

## 🔄 Fluxo dos Agents

1. **Weather Ingestion Agent (`weather_ingestion.py`)**: Conecta-se com APIs externas lidando com falhas, rate-limits e timeouts de forma resiliente.
2. **Wind Direction Agent (`wind_direction_agent.py`)**: Converte graus azimutais em direções cardinais lógicas para o dashboard.
3. **Decision Engine Agent (`decision_engine.py`)**: Aplica a lógica operacional estrita para decidir a bandeira do voo e gravar os históricos analíticos.
4. **Flight Window Agent**: Calcula predições para as próximas 48 horas analisando gradientes de risco.
5. **Analytics & API Agent**: Fornece agregações e endpoints REST rápidos para a UI em Next.js.

---

## 🛠 Como Rodar (Desenvolvimento Local)

### 1. Banco de Dados (PostgreSQL / Supabase Local)

Utilize uma string de conexão PostgreSQL compatível nas variáveis de ambiente.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # No Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copie e edite suas variáveis de ambiente:
cp .env.example .env               

# Inicie a API na porta 8000:
uvicorn app.main:app --reload --port 8000
```
> Documentação interativa disponível em: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install

# Configure o .env para apontar para o backend:
cp .env.example .env.local         

# Inicie o Next.js:
npm run dev
```
> Acesse o Dashboard em: `http://localhost:3000`

---

## 📡 Principais Endpoints da API

| Método | Rota               | Descrição                                 |
|--------|--------------------|-------------------------------------------|
| GET    | `/voo/status`      | Retorna status SAFE/WARNING/PROHIBITED e payload do consenso |
| GET    | `/voo/janela`      | Previsão horária de risco para 48h        |
| GET    | `/analytics/resumo`| KPIs históricos globais (risco médio, totais) |
| GET    | `/analytics/diario`| Agregação de decisões e riscos por dia    |

---

## 📱 Páginas Frontend

| Rota          | Módulo                               |
|---------------|--------------------------------------|
| `/`           | **Controle Operacional**: Bússola dinâmica, cards de fontes, status. |
| `/mapa`       | **Mapa Tático**: Alternância entre Heatmap de Risco e Fluxo de Vento (Windy). |
| `/analytics`  | **Análise Preditiva**: KPIs e gráfico de estabilidade histórica. |
| `/janela`     | **Previsão**: Timeline 48h das próximas condições de voo. |

---

*Projeto construído para garantir o máximo nível de confiabilidade e resiliência a falhas no ecossistema de balonismo.*
