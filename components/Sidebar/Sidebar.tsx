"use client";

import styles from "./Sidebar.module.css";
import { useTopic } from "@/library/context/TopicContext";
import profile from "../../public/profile.png";
import {
  UserButton,
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
} from "@clerk/nextjs";
import Image from "next/image";
import { useEffect, useState } from "react";
import axios from "axios";

const topics = [
  { name: "Life", whispers: 16, icon: "🌱" },
  { name: "Tech", whispers: 5, icon: "💻" },
  { name: "Secrets", whispers: 6, icon: "🤫" },
  { name: "Dreams", whispers: 12, icon: "💭" },
  { name: "Late Night", whispers: 18, icon: "🌙" },
  { name: "Random", whispers: 8, icon: "🎲" },
  { name: "Vibes", whispers: 27, icon: "🎧" },
  { name: "World", whispers: 9, icon: "🌍" },
];

export default function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const { activeTopic, setActiveTopic } = useTopic();
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await axios.get("/api/counts");
        setCounts(res.data);
      } catch (err) {
        console.error("Failed to fetch topic counts:", err);
      }
    };
    fetchCounts();
  }, []);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logo}>
          <h1>Whisper</h1>
          <p>Anonymous Thoughts</p>
        </div>

        {/* Topic Rooms */}
        <div className={styles.topics}>
          <h2>Topic Rooms</h2>
          <ul>
            {topics.map((topic) => (
              <li
                key={topic.name}
                className={`${styles.topicItem} ${
                  activeTopic === topic.name ? styles.active : ""
                }`}
                onClick={() => {
                  setActiveTopic(topic.name);
                  onLinkClick?.();
                }}
              >
                <div className={styles.icon}>{topic.icon}</div>
                <div>
                  <p className={styles.topicName}>{topic.name}</p>
                  {/* Use dynamic count with fallback to 0 */}
                  <p className={styles.whispers}>
                    {counts[topic.name] || 0} Whispers
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Profile */}
        <div className={styles.profile}>
          <div className={styles.wrapper}>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: styles.userAvatar,
                  },
                }}
              />
            </SignedIn>
            <SignedOut>
              <SignInButton>
                <button className={styles.signInBtn}>
                  <Image src={profile} alt="Avatar" />
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          <div>
            <h5>Anonymous</h5>
            <p>Your identity is hidden</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
