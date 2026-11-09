"use client";

import { AppShell } from "@/components/app/AppShell";
import { Bot, AlertCircle, Key, Cpu, ShieldAlert } from "lucide-react";

export default function AIPage() {
  return (
    <AppShell title="Logistimus AI Co-Pilot" subtitle="Conversational logistics intelligence, automated delay mitigation and dispatch planning">
      <div className="max-w-4xl space-y-6">
        {/* Metric / Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">AI Assistant</div>
            <div className="text-2xl font-light tabular-nums text-royal mt-1">Unconfigured</div>
            <div className="text-xs text-[#3F5C96] mt-0.5">Awaiting Provider</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Fabrication Defense</div>
            <div className="text-2xl font-light tabular-nums text-royal mt-1">Strict</div>
            <div className="text-xs text-muted mt-0.5 font-medium">Zero Hallucinations</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">Context Guard</div>
            <div className="text-2xl font-light tabular-nums text-[#0E2F76] mt-1">Tenant RLS</div>
            <div className="text-xs text-[#3F5C96] mt-0.5">Isolated Scopes</div>
          </div>
          <div className="p-4 rounded-card bg-[#FFFFFF] border border-[#CFDBEE]">
            <div className="text-xs font-semibold text-[#061336] uppercase tracking-wider">HTTP Status</div>
            <div className="text-2xl font-light tabular-nums text-[#061336] mt-1">503 Ready</div>
            <div className="text-xs text-[#3F5C96] mt-0.5">Fail-Closed</div>
          </div>
        </div>

        {/* Honest Unconfigured State */}
        <div className="p-8 sm:p-12 rounded-card bg-[#FFFFFF] border border-[#CFDBEE] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-warning border border-warning text-midnight flex items-center justify-center mx-auto">
            <Bot className="w-7 h-7 text-midnight" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-light text-[#061336]">AI Co-Pilot Awaiting LLM Provider Configuration</h2>
            <p className="text-xs text-[#3F5C96] max-w-lg mx-auto leading-relaxed">
              In accordance with Logistimus enterprise data integrity standards, this system will never simulate or fabricate logistics predictions without a verified upstream language model provider.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-input bg-[#F4FEFF] border border-[#CFDBEE] text-left text-xs space-y-2 font-mono">
            <div className="font-semibold text-[#061336] flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#0E2F76]" /> Required Configuration (Backend Environment):
            </div>
            <div className="text-[11px] text-[#3F5C96] space-y-1">
              <div>AI_PROVIDER=anthropic (or openai, deepseek, vllm)</div>
              <div>AI_API_KEY=sk-ant-api03-...</div>
              <div>AI_MODEL=claude-3-5-sonnet</div>
              <div>AI_ALLOW_EXTERNAL_CONTEXT=true</div>
            </div>
          </div>

          <p className="text-[11px] text-[#3F5C96]">
            Once configured in your backend environment, live corridor delay predictions, driver duty advisory, and automated route recommendations will activate securely.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
