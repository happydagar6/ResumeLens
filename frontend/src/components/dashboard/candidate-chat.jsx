// src/components/dashboard/candidate-chat.jsx
// A floating chat widget (like Intercom) that lets recruiters ask the AI
// questions about a specific candidate's resume.
// Architecture: stateless backend. The frontend holds all chat history in useState.

"use client";

import { useState, useRef, useEffect } from "react";
import { useCandidateChat } from "@/hooks/use-screening";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";

export default function CandidateChat({ screeningId }) {
  // isOpen controls whether the chat bubble is expanded or collapsed
  const [isOpen, setIsOpen] = useState(false);

  // messages is the full conversation history stored locally in the browser.
  // Each message is: { role: "user" | "assistant", content: "string" }
  const [messages, setMessages] = useState([]);

  // input is the text currently typed in the input box
  const [input, setInput] = useState("");

  // bottomRef is used to auto-scroll to the latest message after each reply
  const bottomRef = useRef(null);

  // Our React Query mutation hook that calls POST /api/screening/:id/chat
  const chatMutation = useCandidateChat(screeningId);

  // Whenever messages change, scroll the chat window to the bottom
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    // 1. Immediately add the user's message to the UI for fast feedback
    const userMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput(""); // Clear the input box right away

    // 2. Send the question + full history to the backend
    chatMutation.mutate(
      {
        userQuestion: trimmed,
        // We send all PREVIOUS messages as history (not the current one)
        // The backend prompt already has the current question in {userQuestion}
        history: messages,
      },
      {
        onSuccess: (data) => {
          // 3. When the AI responds, add its answer to the conversation
          const aiMessage = { role: "assistant", content: data.data.answer };
          setMessages((prev) => [...prev, aiMessage]);
        },
      }
    );
  };

  // Allow pressing Enter to send (Shift+Enter for newlines)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    // Fixed positioning anchors this widget to the bottom-right corner of the page
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ── Chat Window (visible when isOpen is true) ── */}
      {isOpen && (
        <div className="flex h-120 w-90 flex-col rounded-2xl border bg-background shadow-2xl">

          {/* Header bar */}
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary-foreground" />
              <span className="text-sm font-semibold text-primary-foreground">
                Ask about this candidate
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/70 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages area — scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* Welcome message shown before any messages */}
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-8 px-4">
                <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Ask me anything about this candidate&apos;s resume, skills, or experience.</p>
                <p className="mt-1 text-xs">e.g. &quot;Does this candidate know Docker?&quot;</p>
              </div>
            )}

            {/* Render each message bubble */}
            {messages.map((msg, i) => (
              <div
                key={i}
                // User messages go to the right; AI messages go to the left
                className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar icon */}
                <div className={`shrink-0 rounded-full p-1.5 ${msg.role === "user" ? "bg-primary" : "bg-muted"}`}>
                  {msg.role === "user"
                    ? <User className="h-3.5 w-3.5 text-primary-foreground" />
                    : <Bot className="h-3.5 w-3.5 text-foreground" />
                  }
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"      // Blue bubble on right
                      : "bg-muted text-foreground"                // Gray bubble on left
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator while AI is thinking */}
            {chatMutation.isPending && (
              <div className="flex items-start gap-2">
                <div className="shrink-0 rounded-full bg-muted p-1.5">
                  <Bot className="h-3.5 w-3.5 text-foreground" />
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}

            {/* Invisible div at the bottom — we scroll to this after new messages */}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-3 flex items-center gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this candidate…"
              disabled={chatMutation.isPending}
              className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Floating Toggle Button ── */}
      {/* This is always visible; clicking it opens/closes the chat window */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Chat with AI about this candidate"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
