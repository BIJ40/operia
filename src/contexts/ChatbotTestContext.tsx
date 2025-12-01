import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatbotTestContextType {
  isTestMode: boolean;
  setTestMode: (value: boolean) => void;
}

const ChatbotTestContext = createContext<ChatbotTestContextType>({
  isTestMode: false,
  setTestMode: () => {},
});

export const useChatbotTest = () => useContext(ChatbotTestContext);

export function ChatbotTestProvider({ children }: { children: ReactNode }) {
  const [isTestMode, setTestMode] = useState(false);
  return (
    <ChatbotTestContext.Provider value={{ isTestMode, setTestMode }}>
      {children}
    </ChatbotTestContext.Provider>
  );
}
