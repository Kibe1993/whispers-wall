"use client";

import styles from "./Sidebar.module.css";
import { useTopic } from "@/library/context/TopicContext";
import profile from "../../public/profile.png";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import { useEffect, useState } from "react";
import axios from "axios";
import Pusher from "pusher-js";

const topics = [
  { name: "Life", icon: "🌱" },
  { name: "Tech", icon: "💻" },
  { name: "Secrets", icon: "🤫" },
  { name: "Dreams", icon: "💭" },
  { name: "Late Night", icon: "🌙" },
  { name: "Random", icon: "🎲" },
  { name: "Vibes", icon: "🎧" },
  { name: "World", icon: "🌍" },
];

export default function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const { activeTopic, setActiveTopic } = useTopic();
  const [counts, setCounts] = useState<Record<string, number>>({});

  // fetch counts
  const fetchCounts = async () => {
    try {
      const res = await axios.get("/api/counts");
      setCounts(res.data);
    } catch (err) {
      console.error("Failed to fetch topic counts:", err);
    }
  };

  useEffect(() => {
    fetchCounts();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    topics.forEach((topic) => {
      const channel = pusher.subscribe(`topic-${topic.name}`);

      channel.bind("new-message", () => {
        fetchCounts();
      });

      channel.bind("delete-message", () => {
        fetchCounts(); // refresh counts when a whisper is deleted
      });
    });

    return () => {
      topics.forEach((topic) => {
        pusher.unsubscribe(`topic-${topic.name}`);
      });
    };
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
                  if (activeTopic !== topic.name) {
                    setActiveTopic(topic.name);
                    onLinkClick?.();
                  }
                }}
              >
                <div className={styles.icon}>{topic.icon}</div>
                <div>
                  <p className={styles.topicName}>{topic.name}</p>
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
