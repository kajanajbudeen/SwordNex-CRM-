import React, { createContext, useContext, useState } from 'react';
import { apiClient } from '../api/client';

export interface CopilotMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  suggestedActions?: string[];
  citations?: string[];
  timestamp: string;
}

interface CopilotContextType {
  isOpen: boolean;
  toggleCopilot: () => void;
  openCopilot: () => void;
  closeCopilot: () => void;
  messages: CopilotMessage[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  quickPrompt: (prompt: string) => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export const CopilotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'AI',
      text: 'Hello! I am your SwordNex AI Sales Copilot. Ask me about pipeline forecasts, lead scoring insights, overdue follow-ups, or deal progression tactics.',
      suggestedActions: [
        'Forecast revenue for current quarter',
        'Show high-priority leads needing follow-up',
        'Which deals are stalled in proposal stage?',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const toggleCopilot = () => setIsOpen((prev) => !prev);
  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: CopilotMessage = {
      id: `usr_${Date.now()}`,
      sender: 'USER',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/ai/copilot', { question: text });
      if (res.success && res.data) {
        const aiMsg: CopilotMessage = {
          id: `ai_${Date.now()}`,
          sender: 'AI',
          text: res.data.answer,
          suggestedActions: res.data.suggestedActions,
          citations: res.data.citations,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `err_${Date.now()}`,
        sender: 'AI',
        text: `Error connecting to AI Gateway: ${err.message || 'Please check your connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompt = (prompt: string) => {
    openCopilot();
    sendMessage(prompt);
  };

  return (
    <CopilotContext.Provider
      value={{
        isOpen,
        toggleCopilot,
        openCopilot,
        closeCopilot,
        messages,
        sendMessage,
        isLoading,
        quickPrompt,
      }}
    >
      {children}
    </CopilotContext.Provider>
  );
};

export const useCopilot = () => {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within CopilotProvider');
  }
  return context;
};
