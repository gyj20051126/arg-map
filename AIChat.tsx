
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Greetings. I am the ARG MAP AI. I can assist you with analyzing ARG distribution and PCoA trends. How may I help?" }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initChat = () => {
     if (!chatRef.current) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.chats.create({
           model: 'gemini-3-flash-preview',
           config: {
              systemInstruction: "You are the specialized AI Assistant for ARG MAP, a 3D Global Surveillance platform for Antimicrobial Resistance Genes (ARGs). \n\nContext:\n- The app visualizes metagenomic samples.\n- Views: 'Global Map' (3D globe colored by Continent) and 'PCoA' (2D scatter plot colored by Habitat).\n- Trends View: Predicts ARG accumulation using centroid drift analysis towards 2030.\n- User can upload their own CSV data (visualized as distinct Neon Fuchsia stars).\n\nGoal: Help users interpret the ecological and geographical trends of ARG transmission. Be concise, professional, and tech-savvy. If the user asks about specific data on the screen, provide general guidance on how to interpret the visualization."
           }
        });
     }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsSending(true);
    
    // Lazy init the chat session
    initChat();

    try {
        const response = await chatRef.current.sendMessage({ message: userText });
        const text = response.text;
        setMessages(prev => [...prev, { role: 'model', text: text }]);
    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: "Error: Unable to establish link with neural core. Please check network or API configuration." }]);
    } finally {
        setIsSending(false);
    }
  };

  return (
    <>
        {/* Toggle Button */}
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300 hover:scale-110 group ${isOpen ? 'bg-slate-800 text-cyan-400 rotate-90' : 'bg-cyan-500 text-black'}`}
        >
            {isOpen ? <X size={24} /> : <MessageSquare size={24} className="group-hover:animate-pulse" />}
        </button>

        {/* Chat Window */}
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-24 right-6 z-50 w-80 md:w-96 h-[500px] bg-[#0a1025]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white tracking-wide">ARG MAP AI</div>
                                <div className="text-[10px] text-cyan-500/70 uppercase tracking-widest">Assistant Online</div>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-cyan-600 text-white rounded-tr-none' 
                                    : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isSending && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-white/10 bg-black/20">
                        <div className="flex gap-2">
                            <input 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask about ARG distribution..."
                                className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={isSending}
                                className="p-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
  );
};

export default AIChat;
