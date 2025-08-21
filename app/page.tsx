"use client";
import styles from "./page.module.css";
import ChatPage from "@/components/ChatArea/Chatpage";

export default function Home() {
  return (
    <main className={styles.main}>
      <ChatPage />
    </main>
  );
}
