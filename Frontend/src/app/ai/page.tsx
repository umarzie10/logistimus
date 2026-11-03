"use client";

import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Bot, Send, AlertTriangle } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  text: string;
  time: string;
  recommendation?: {
    title: string;
    action: string;
    impact: string;
  };
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    text: "Hello Alisher, I am Logistimus AI. I've analyzed your fleet telemetry and active corridors for this morning. You have 362 vehicles moving across 48 corridors with a 96.4% on-time confidence.",
    time: "09:30",
    recommendation: {
      title: "Weather Congestion Alert: Kamchik Mountain Pass",
      action: "Reroute 4 inbound trucks via alternate southern junction to prevent +45m delay",
      impact: "Estimated time saved: 180 vehicle-minutes · Fuel saved: ~34 liters",
    },
  },
  {
    role: "user",
    text: "What is the status of high-priority order ORD-24102 for Axis Distribution?",
    time: "09:35",
  },
  {
    role: "assistant",
    text: "Order ORD-24102 was safely delivered at 09:20 to Tashkent Medical Center by driver Bobur Turgunov (REEFER-04). All cold-chain temperature logs stayed strictly at -18.2°C throughout the transit corridor. Digital proof of delivery was signed and archived.",
    time: "09:36",
  },
];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      role: "user",
      text: input,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate intelligent logistics response
    setTimeout(() => {
      const aiReply: Message = {
        role: "assistant",
        text: `Logistimus Engine analyzed your query regarding "${input}". All warehouse inventory levels, driver duty logs, and active GPS waypoints are synchronized. Recommended action has been logged to your dispatch ledger.`,
        time: "Just now",
      };
      setMessages((prev) => [...prev, aiReply]);
    }, 600);
  };

  return (
    <AppShell title="Logistimus AI Co-Pilot" subtitle="Conversational logistics intelligence, automated delay mitigation and dispatch planning">
      <div className="h-[calc(100vh-10rem)] max-w-4xl mx-auto flex flex-col rounded-card bg-[#FFFFFF] border border-[#CFDBEE] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 bg-[#0E2F76] text-[#FFFFFF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-input bg-success/20 text-success flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Logistimus Core Intelligence</div>
              <div className="text-[11px] text-[#A9C0E0] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live Model · Telematics API v2.4 Connected
              </div>
            </div>
          </div>
          <span className="text-xs font-mono text-[#A9C0E0] bg-[#FFFFFF]/10 px-2.5 py-1 rounded-full">
            Confidence: 99.4%
          </span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#ffffff]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-xl p-4 rounded-card text-xs sm:text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#0E2F76] text-[#FFFFFF] rounded-br-none"
                    : "bg-[#FFFFFF] text-[#061336] border border-[#CFDBEE] rounded-bl-none"
                }`}
              >
                <p>{m.text}</p>

                {m.recommendation && (
                  <div className="mt-3 p-3 rounded-input bg-warning/15 border border-warning/40 text-xs text-[#061336] space-y-1.5">
                    <div className="font-semibold text-midnight flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-midnight" />
                      {m.recommendation.title}
                    </div>
                    <div className="text-[#3F5C96]">{m.recommendation.action}</div>
                    <div className="text-[11px] font-mono font-semibold text-midnight">
                      {m.recommendation.impact}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#3F5C96] mt-1 px-1">
                {m.time}
              </span>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-[#FFFFFF] border-t border-[#CFDBEE] flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI: e.g. Which trucks need maintenance this week? Any delayed shipments?"
            className="flex-1 px-4 py-2.5 rounded-input border border-[#CFDBEE] bg-[#ffffff] text-xs sm:text-sm text-[#061336] focus:outline-none focus:border-[#0E2F76]"
          />
          <button
            type="submit"
            className="p-2.5 rounded-full bg-[#0E2F76] hover:bg-[#061336] text-[#FFFFFF] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
