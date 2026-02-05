// src/app/(customer)/layout.tsx

'use client';

import React, { useState } from 'react';
import { Header } from '@/components/customer/Header';
import Footer from '@/components/customer/Footer';
import { CartSidebar } from '@/components/customer/CartSidebar';
import ChatbotWidget from '@/components/customer/ChatbotWidget';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleOpenCart = () => setIsCartOpen(true);
  const handleCloseCart = () => setIsCartOpen(false);

  // Get restaurant ID from settings or default
  const restaurantId = 'rest123456789';

  return (
    <>
      {/* Header - Fixed at top */}
      <Header onCartOpen={handleOpenCart} />

      {/* Main Content - Add top padding to account for fixed header (80px height) */}
      <main className="min-h-screen pt-20" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Cart Sidebar - Overlay */}
      <CartSidebar isOpen={isCartOpen} onClose={handleCloseCart} />

      {/* AI Chatbot Widget - Floating button on all customer pages */}
      <ChatbotWidget restaurantId={restaurantId} />
    </>
  );
}