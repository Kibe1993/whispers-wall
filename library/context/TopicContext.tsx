"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type TopicContextType = {
  activeTopic: string;
  setActiveTopic: (topic: string) => void;
};

const TopicContext = createContext<TopicContextType | undefined>(undefined);

export function TopicProvider({ children }: { children: ReactNode }) {
  const [activeTopic, setActiveTopic] = useState("Life"); // default topic
  return (
    <TopicContext.Provider value={{ activeTopic, setActiveTopic }}>
      {children}
    </TopicContext.Provider>
  );
}

export function useTopic() {
  const context = useContext(TopicContext);
  if (!context) throw new Error("useTopic must be used inside TopicProvider");
  return context;
}
