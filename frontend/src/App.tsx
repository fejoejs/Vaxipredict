import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ProtectedRoute, RoleGuard } from "./components/ui/Guards";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Predictions from "./pages/Predictions";
import Heatmap from "./pages/Heatmap";
import Forecasting from "./pages/Forecasting";
import Interventions from "./pages/Interventions";
import Reminders from "./pages/Reminders";
import Rumors from "./pages/Rumors";
import KnowledgeLibrary from "./pages/KnowledgeLibrary";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";

// New Dropdown Navigation Pages
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import NotificationsPage from "./pages/NotificationsPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Analyst & Admin Only */}
          <Route element={<RoleGuard roles={["admin", "analyst"]} />}>
            <Route path="/upload" element={<Upload />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Health Worker, Analyst & Admin Only */}
          <Route element={<RoleGuard roles={["admin", "analyst", "health_worker"]} />}>
            <Route path="/interventions" element={<Interventions />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/rumors" element={<Rumors />} />
          </Route>

          {/* All Roles */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/heatmap" element={<Heatmap />} />
          <Route path="/forecasting" element={<Forecasting />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/knowledge" element={<KnowledgeLibrary />} />
          
          {/* Protected Profile & Dropdown Subpages */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route element={<RoleGuard roles={["admin"]} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
