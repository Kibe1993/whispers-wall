"use client";
import { useState } from "react";
import Sidebar from "../Sidebar/Sidebar";
import Navbar from "../Navbar/Navbar";
import styles from "./ResponsiveLayout.module.css";
import { TopicProvider } from "@/library/context/TopicContext";

export default function ResponsiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <TopicProvider>
      <div className={styles.layout}>
        {/* Sidebar */}
        <div
          className={`${styles.sidebarWrapper} ${
            sidebarOpen ? styles.open : styles.closed
          }`}
        >
          <Sidebar onLinkClick={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className={styles.main}>
          <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className={styles.content}>{children}</main>
        </div>

        {/* Overlay (mobile only) */}
        {sidebarOpen && (
          <div
            className={styles.overlay}
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
      </div>
    </TopicProvider>
  );
}
