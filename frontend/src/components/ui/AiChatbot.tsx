import { useState, useEffect, useRef } from "react";
import { apiClient } from "../../api/client";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

const SUGGESTIONS = [
  "Which states have the highest hesitancy?",
  "Tell me about active rumors.",
  "Show upcoming reminders.",
  "How do I navigate the platform?",
];

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("vaxipredict_chat_history");
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      // Seed initial greeting message
      const initial: ChatMessage = {
        sender: "ai",
        text: "### 👋 Welcome to VaxInsight!\n\nI can help explain dashboard insights, view flagged rumor statistics, find upcoming reminders, and help navigate the platform.\n\nTry asking me a question or click a suggestion below!",
      };
      setMessages([initial]);
      localStorage.setItem("vaxipredict_chat_history", JSON.stringify([initial]));
    }
  }, []);

  // Save history to localStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("vaxipredict_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend(textToSend: string) {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Map frontend history to backend expectation
      const backendHistory = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const { data } = await apiClient.post("/ai/chat", {
        message: textToSend,
        history: backendHistory,
      });

      const aiMsg: ChatMessage = { sender: "ai", text: data.reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        sender: "ai",
        text: "⚠️ *Sorry, I ran into an error connecting to the intelligence server. Please try again in a moment.*",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function clearHistory() {
    const initial: ChatMessage = {
      sender: "ai",
      text: "### 👋 Chat history cleared.\n\nHow can I help you analyze vaccine hesitancy trends today?",
    };
    setMessages([initial]);
    localStorage.setItem("vaxipredict_chat_history", JSON.stringify([initial]));
  }

  // Basic markdown formatter helper to parse headers, bold text, lists, and links in the chatbot
  function formatMessage(text: string) {
    return text.split("\n").map((line, idx) => {
      let content: React.ReactNode = line;

      // Headers ###
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-semibold text-sm mt-3 mb-1 text-purple-300">
            {line.substring(4)}
          </h4>
        );
      }

      // Bold text **
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        content = parts.map((part, pIdx) =>
          pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-bold">{part}</strong> : part
        );
      }

      // Code blocks `
      const codeRegex = /`(.*?)`/g;
      if (codeRegex.test(line)) {
        // Recurse/map parts
        const lineStr = line;
        const parts = lineStr.split(codeRegex);
        content = parts.map((part, pIdx) =>
          pIdx % 2 === 1 ? (
            <code key={pIdx} className="bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono text-purple-400">
              {part}
            </code>
          ) : (
            part
          )
        );
      }

      // List items - or 1.
      if (line.startsWith("- ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-300 my-1">
            {content}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/);
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-slate-300 my-1">
            {match ? match[2] : content}
          </li>
        );
      }

      // Link markdown [text](url)
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      if (linkRegex.test(line)) {
        const parts = line.split(linkRegex);
        // parts format: [text_before_link, link_text, link_url, text_after_link]
        // Since regex has 2 capture groups, split returns: [before, text1, url1, after...]
        const elements: React.ReactNode[] = [];
        for (let i = 0; i < parts.length; i += 3) {
          elements.push(parts[i]);
          if (i + 2 < parts.length) {
            elements.push(
              <a
                key={i}
                href={parts[i + 2]}
                className="text-purple-400 font-medium hover:underline hover:text-purple-300"
              >
                {parts[i + 1]}
              </a>
            );
          }
        }
        return <p key={idx} className="text-xs text-slate-200 my-1">{elements}</p>;
      }

      return line.trim() === "" ? (
        <div key={idx} className="h-2" />
      ) : (
        <p key={idx} className="text-xs text-slate-200 leading-relaxed my-1">
          {content}
        </p>
      );
    });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Window */}
      {isOpen && (
        <div className="w-[360px] h-[500px] bg-slate-900/95 backdrop-blur-xl border border-line rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-purple-950/80 px-4 py-3 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="font-semibold text-sm tracking-tight text-white">VaxInsight</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
                title="Clear chat history"
                className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                    m.sender === "user"
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-none"
                  }`}
                >
                  {formatMessage(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-2xl rounded-bl-none px-4 py-3 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="px-4 py-2 bg-slate-950/40 border-t border-line/40 overflow-x-auto flex gap-1.5 scrollbar-thin">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="bg-slate-800/60 hover:bg-slate-800 text-[10px] text-purple-300 border border-purple-500/20 rounded-full px-3 py-1 whitespace-nowrap transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 bg-slate-950/80 border-t border-line flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask about hesitancy, rumors, reminders..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-line rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-all focus:outline-none ring-4 ring-purple-500/20 hover:ring-purple-500/40"
        title="VaxInsight"
      >
        {isOpen ? "💬" : "🤖"}
      </button>
    </div>
  );
}
