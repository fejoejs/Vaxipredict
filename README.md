# 🛡️ VaxiPredict — AI-Powered Spatial-temporal intelligence platform

> VaxiPredict is an AI-powered spatial-temporal intelligence platform designed to forecast vaccine hesitancy risks and optimize immunization campaigns. Powered by a hybrid GNN-LSTM deep learning pipeline, React (TypeScript), and FastAPI.

---

## 🚀 Key Features

*   **🔮 Hybrid GNN-LSTM Prediction Engine:** Model temporal-spatial vaccine hesitancy trends. GNN models geographical boundary relationships while LSTM forecasts local temporal coverage slopes.
*   **📊 Interactive Analytics Dashboard:** High-fidelity regional maps, hesitancy distributions, risk breakdown charts (low, moderate, high, critical), and vaccine coverage projections.
*   **💬 AI Fact-Checking Assistant:** Conversational agent integrating Google Gemini API to analyze public claims, parse rumors, and generate verified fact-sheets.
*   **📋 Intervention Planner & Simulator:** Design and simulate target strategies (e.g. mobile clinics, awareness drives) to forecast hesitancy score reductions.
*   **⏰ Automated Reminders Center:** Schedule and queue SMS reminders for immunization campaigns, with status logging and real-time delivery stats.
*   **📂 CDC Dataset Manager:** Process, validate, and ingest vaccine coverage datasets (CSV/Excel) with quality scoring.
*   **🔐 Secure Authentication & Profiles:** Includes case-insensitive logins, Google OAuth 2.0 SSO, custom avatar uploads, and dynamic vector SVG default avatars.

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 (TypeScript), Vite, Tailwind CSS | Snappy UI, modular component rendering, utility-first styling. |
| **Backend** | FastAPI (Python 3.10+) | High-performance, asynchronous REST API framework. |
| **ML Engine** | PyTorch, NetworkX, NumPy | GNN spatial graph convolution, LSTM temporal trend forecasting. |
| **AI Layer** | Google Gemini 2.5 Flash | Real-time context-aware chatbot and rumor fact-checking. |
| **Outreach** | Meta WhatsApp Business API | Dispatches automated vaccination schedules to beneficiaries. |
| **Database** | PostgreSQL (Local & Production) | Relational storage of user roles and CDC records. |

---

## 🧠 AI Components

### 1. Hybrid GNN + LSTM Model
Predicts regional vaccine hesitancy by combining:
*   **Graph Neural Network (GNN):** Stacks graph layers to propagate hesitancy risks and compute spatial influence across borders:
    \[Z^{(l+1)} = \sigma(\tilde{A} Z^{(l)} W)\]
*   **LSTM:** Standard recurrent cells that process historical sequences `[doses_administered, hesitancy_rate, misinformation_index]` per period.

**Outputs:**
*   `Hesitancy score` (float `[0.0, 1.0]`)
*   `Prediction confidence` (float `[0.0, 1.0]`)

### 2. AI Health Assistant
Powered by **Google Gemini 2.5 Flash**, the intelligent assistant is capable of:
*   Answering platform-related questions.
*   Summarizing vaccination trends.
*   Explaining analytics and dashboard metrics.
*   Supporting health workers on field visits with contextual insights.

### 3. Vaccine Fact Checker
Allows users to verify vaccine-related claims and receive structured reports containing:
*   `Misinformation score` (veracity health audit rating, e.g. `DEBUNKED / HIGH MISINFORMATION`).
*   `Scientific explanation` (clear, counter-arguments based on evidence).
*   `Risk assessment` (harm rating float `[0.0, 1.0]`).
*   `WHO-based evidence` (WHO and UNICEF vaccine guideline data).

---

## 📂 Project Structure

```text
vaxipredict/
├── backend/                  FastAPI API Engine + ML Models
│   ├── app/
│   │   ├── api/routes/       Modular API routes (auth, dashboard, predictions, reports, etc.)
│   │   ├── core/             Security (bcrypt/jose), CORS, central config
│   │   ├── db/               Session management, declarative base schema, seed scripts
│   │   ├── ml/               SpatialGNN, TemporalLSTM definition & pipeline builders
│   │   ├── models/           SQLAlchemy models (User, Region, Dataset, Prediction, etc.)
│   │   ├── schemas/          Pydantic schemas for strict request/response validation
│   │   └── services/         Ingestion parser, WhatsApp gateway, reports builder, Gemini AI
│   └── requirements.txt      Python dependencies (PyTorch, SQLAlchemy, NetworkX, psycopg2)
├── frontend/                 React + TypeScript + Vite Single Page Application
│   └── src/
│       ├── api/              Axios client with automatic token interceptors
│       ├── components/       Shared layout (Header, Footer, Primitives)
│       ├── context/          AuthContext (JWT, user profile sync)
│       ├── pages/            Core view templates (Dashboard, Interventions, Heatmap, etc.)
│       └── utils/            Shared utility helpers (dynamic SVG default avatars)
├── render.yaml               Infrastructure blueprint for automated multi-service deploy
└── README.md                 Comprehensive project documentation
```

---

## 🔒 Security

*   **SQL Injection Prevention:** Parametric ORM queries (SQLAlchemy).
*   **Access Token Protection:** HTTPOnly cookies with SameSite strictness settings.
*   **Google OAuth Auditing:** Automatically verifies token audiences (`aud`) against Google Client IDs to block token replay hacks. Emails are case-normalized and trimmed of whitespace to prevent account replication.
*   **Performance Query Indexing:** Indices placed on `PredictionResult` (`region_id` and `created_at`) and `VaccinationRecord` (`region_id` and `period`) to accelerate dashboard aggregations and GNN sequences.

---

## 🚀 Getting Started

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate a virtual environment:
   ```bash
   .venv\Scripts\activate  
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the database tables:
   ```bash
   python app/db/seed.py
   ```
5. Run the FastAPI dev server:
   ```bash
   python -m uvicorn app.main:app --port 8001 --reload
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
