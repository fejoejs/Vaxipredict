import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import AiChatbot from "../ui/AiChatbot";
import { useAuth } from "../../context/AuthContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header />
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 ${isHomePage ? "pt-20 sm:pt-24 pb-8" : "py-8"} relative`}>
        {children}
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink/30 bg-slate-950/20">
        VaxiPredict — AI-Powered Vaccine Hesitancy Intelligence Platform
      </footer>

      {/* Floating AI chatbot assistant rendered application-wide */}
      {isAuthenticated && <AiChatbot />}
    </div>
  );
}
