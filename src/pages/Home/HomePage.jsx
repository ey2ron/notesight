import React, { useState } from "react";
import { Sidebar } from "../../components/SideBar/SideBar";

export function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header>
        <button onClick={() => setSidebarOpen(true)} className="menu-btn">
          ☰
        </button>
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="home-content">
        <h1>Home Page</h1>
      </main>
    </>
  );
}
