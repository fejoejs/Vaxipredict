# VaxiPredict — AI-Powered Routine Immunization Intelligence Platform

VaxiPredict is a premium, enterprise-grade public health surveillance platform designed to predict vaccine hesitancy risks, monitor vaccine-preventable diseases (VPDs), track routine immunization coverage, detect misinformation rumors, and coordinate community outreach.

Built with a modern **React + Vite** frontend, a **FastAPI** backend, a **hybrid GNN + LSTM** prediction model, and integrations with **Google Gemini 2.5** and the **Meta WhatsApp Business API**.

---

## 📂 Project Architecture

```text
vaxipredict/
├── backend/                  FastAPI API Engine + ML Models
│   ├── app/
│   │   ├── api/routes/       Modular API routers (auth, dashboard, admin, rumors, etc.)
│   │   ├── core/             Security (bcrypt/jose), CORS, central config
│   │   ├── db/               Session management, declarative base schema, seed scripts
│   │   ├── ml/               SpatialGNN, TemporalLSTM definition & pipeline builders
│   │   ├── models/           SQLAlchemy models (User, Region, Dataset, Prediction, etc.)
│   │   ├── schemas/          Pydantic schemas for strict request/response validation
│   │   └── services/         Ingestion parser, WhatsApp gateway, reports builder, Gemini AI
│   └── requirements.txt      Python dependencies (PyTorch, SQLAlchemy, NetworkX, psycopg2)
├── frontend/                 React + TypeScript + Vite Single Page Application
│   ├── public/               PWA configuration assets (manifest.json, sw.js)
│   └── src/
│       ├── api/              Axios client with automatic token interceptors
│       ├── components/       Shared layout (Header, Footer, Primitives)
│       ├── context/          AuthContext (JWT, user profile sync)
│       └── pages/            Core view templates (Dashboard, Interventions, Heatmap, etc.)
├── render.yaml               Infrastructure blueprint for automated multi-service deploy
└── README.md                 Comprehensive project documentation
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 (TypeScript), Vite, Tailwind CSS | Snappy UI, modular component rendering, utility-first styling. |
| **PWA** | Service Workers, Web App Manifest | Enables offline access and caching for ASHA workers in remote visits. |
| **Backend** | FastAPI (Python 3.10+) | High-performance, asynchronous REST API framework. |
| **ML Engine** | PyTorch, NetworkX, NumPy | GNN spatial graph convolution, LSTM temporal trend forecasting. |
| **AI Layer** | Google Gemini 2.5 Flash | Real-time context-aware chatbot and rumor fact-checking. |
| **Outreach** | Meta WhatsApp Business API | Dispatches automated vaccination schedules to beneficiaries. |
| **Database** | PostgreSQL (Local & Production) | Persistent, relational storage of user roles and CDC records. |

---

## 🧠 Advanced AI & Machine Learning Systems

### 1. Hybrid GNN + LSTM Prediction Pipeline
Defined in [gnn_lstm.py](file:///c:/Users/Fejoe/Downloads/vaxipredict/vaxipredict/backend/app/ml/gnn_lstm.py):
*   **`SpatialGNN`:** Computes spatial influence across border edges using graph message passing: $Z^{(l+1)} = \sigma(\tilde{A} Z^{(l)} W)$. Stacking two graph layers propagates hesitancy risks up to 2-hops.
*   **`TemporalLSTM`:** Standard recurrent cells that process historical sequences: `[doses_administered, hesitancy_rate, misinformation_index]` per period.
*   **`FusionHead`:** Concatenates both embeddings and projects outputs to `(hesitancy_score, confidence)`.
*   **Weights Loading:** If a trained checkpoint is present at `checkpoints/hybrid.pt`, the system loads it immediately (`hybrid-gnn-lstm-v1-trained`). Otherwise, it runs the PyTorch forward pass on initialized parameters.

### 2. Context-Aware AI Chatbot (Gemini 2.5 Flash)
*   **Route:** `/api/v1/ai/chat` (handled in [ai_chat.py](file:///c:/Users/Fejoe/Downloads/vaxipredict/vaxipredict/backend/app/services/ai_chat.py)).
*   **Logic:** Before querying Gemini, the backend performs live database aggregations (total tracked regions, average predicted hesitancy, active rumors, pending reminders, and total interventions). 
*   **Dynamic Prompt Injection:** The stats are injected directly into Gemini's system instructions, allowing the chatbot to answer questions about live platform states accurately.

### 3. AI Rumor Audit & Fact-Checking Search
*   **Route:** `/api/v1/knowledge/factcheck` (handled in [knowledge.py](file:///c:/Users/Fejoe/Downloads/vaxipredict/vaxipredict/backend/app/api/routes/knowledge.py)).
*   **Logic:** Users submit claims to evaluate vaccine myths. The backend queries Gemini 2.5 with instructions to return a structured JSON object containing:
    1.  `veracity`: A health audit rating (e.g. `DEBUNKED / HIGH MISINFORMATION`).
    2.  `risk_score`: Harm rating (float `[0.0, 1.0]`).
    3.  `category`: Classification tag.
    4.  `counter_argument`: Scientifically backed explanation based on WHO guidelines.

---

## 📡 Messaging & Field Outreach Gateways

### 1. Meta WhatsApp Business API Integration
*   Dispatches text alerts to parent contact numbers when a child's vaccine schedule is due.
*   **Phone Sanitization:** Cleans formatting (`+`, `-`, spaces) and prepends the country code (defaults to India `91` if a 10-digit number is passed).
*   **Simulation Mode:** If `WHATSAPP_BEARER_TOKEN` is unconfigured, the system runs a simulated loop logging output structures to console to save API quotas.

### 2. ASHA Offline PWA (Progressive Web App)
*   Equipped with `manifest.json` and a caching service worker (`sw.js`) to support health workers in remote locations without internet coverage.
*   Caches static pages, stylesheets, icons, and API assets.

---

## 🔒 Security & RBAC (Role-Based Access Control)

### 1. Privilege Escalation Protection
*   The registration schema in [schemas/auth.py](file:///c:/Users/Fejoe/Downloads/vaxipredict/vaxipredict/backend/app/schemas/auth.py) excludes the `role` field.
*   The registration endpoint in [auth.py](file:///c:/Users/Fejoe/Downloads/vaxipredict/vaxipredict/backend/app/api/routes/auth.py) hardcodes all signups to `UserRole.HEALTH_WORKER`. Users cannot inject administrative roles (`role: "admin"`) on registration. Administrative roles can only be granted by existing administrators through the admin panel.

### 2. Password & Token Security
*   **Hashing:** Passwords hashed using `bcrypt.hashpw` with a secure random salt.
*   **JWT Session Storage:** Tokens are returned on login and stored securely in an `HttpOnly` Cookie (`access_token`), protecting users from Cross-Site Scripting (XSS) token extraction.

---

## ⚙️ Local Development Setup

### 1. Database & Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=postgresql://vaxipredict:vaxipredict@localhost:5432/vaxipredict
JWT_SECRET=your-secure-jwt-secret-string-here
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
UPLOAD_DIR=uploads
GEMINI_API_KEY=your_google_gemini_api_key
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_BEARER_TOKEN=your_meta_bearer_token
```

### 2. Run Local PostgreSQL Database
Ensure you have a PostgreSQL server running locally. You can start one using Docker:
```bash
docker run --name vaxipredict-db -p 5432:5432 -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=vaxipredict -d postgres
```
Create a database named `vaxipredict` (or matching the credential string in your `DATABASE_URL`).

### 3. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
python -m app.db.seed
python -m uvicorn app.main:app --reload
```

Pre-seeded Login credentials:
*   **Admin:** `admin@vaxipredict.io` | `Admin@123`
*   **Analyst:** `analyst@vaxipredict.io` | `Analyst@123`
*   **Health Worker:** `worker@vaxipredict.io` | `Worker@123`

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🐙 Push Code to GitHub

To commit the latest security audits, mobile responsive adjustments, and database enhancements to GitHub, execute:
```bash
git add .
git commit -m "Configure VaxiPredict platform with security updates, responsive layouts, and PostgreSQL persistence"
git push origin main
```

---

## 🚀 Deploying to Production (Render)

The project includes a [render.yaml](file:///c:/Users/Fejoe/Downloads/vaxipredict/vaxipredict/render.yaml) template. To deploy:
1.  Connect your GitHub repository to Render.
2.  Create a new **Blueprint** service pointing to the repository.
3.  Render will configure:
    *   `vaxipredict-db`: A managed PostgreSQL database.
    *   `vaxipredict-api`: FastAPI Python web server.
    *   `vaxipredict-frontend`: Static Vite website.
4.  Once deployed, run `python -m app.db.seed` in the Render web shell to set up default tables and admin credentials.
