"use client";

import styles from "./page.module.css";
import ChatPage from "@/components/ChatArea/Chatpage";
import { useUser, SignInButton } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn } = useUser();

  return (
    <main className={styles.main}>
      {isSignedIn ? (
        <ChatPage />
      ) : (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <h2>Welcome to Whispers 👋</h2>
            <p>
              Sign in to join the conversation. Your identity stays hidden —
              only your whispers are shared.
            </p>
            <SignInButton mode="modal">
              <button className={styles.signInBtn}>Sign In</button>
            </SignInButton>
          </div>
        </div>
      )}
    </main>
  );
}
