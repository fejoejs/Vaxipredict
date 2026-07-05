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

## 🔒 Security

*   **SQL Injection Prevention:** Parametric ORM queries (SQLAlchemy).
*   **Access Token Protection:** HTTPOnly cookies with SameSite strictness settings.
*   **Google OAuth Auditing:** Automatically verifies token audiences (`aud`) against Google Client IDs to block token replay hacks. Emails are case-normalized and trimmed of whitespace to prevent account replication.
*   **Performance Query Indexing:** Indices placed on `PredictionResult` (`region_id` and `created_at`) and `VaccinationRecord` (`region_id` and `period`) to accelerate dashboard aggregations and GNN sequences.

---

## 🌐 Live Demo

You can access the live application here:
🔗 **[VaxiPredict Live Link](https://your-live-deployment-link.com)**
