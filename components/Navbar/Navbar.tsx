"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import styles from "./Navbar.module.css";

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className={styles.navbar}>
      <div className={styles.container}>
        {/* Menu button (mobile only) */}
        <button
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="Toggle Menu"
        >
          ☰
        </button>

        {/* Logo */}
        <div className={styles.logo}>
          <h1>Whisper</h1>
          <p>Share your thoughts anonymously</p>
        </div>

        {/* Action */}
        <div className={styles.action}>
          {/* Show sign in modal if signed out */}
          <SignedOut>
            <SignInButton mode="modal">
              <button>Sign In</button>
            </SignInButton>
          </SignedOut>

          {/* Show user profile button if signed in */}
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
