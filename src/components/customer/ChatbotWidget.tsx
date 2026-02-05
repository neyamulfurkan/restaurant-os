// src/components/customer/ChatbotWidget.tsx

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Loader2, ShoppingCart, Calendar, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getFromLocalStorage, setToLocalStorage } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import { MenuItemModal } from './MenuItemModal';
import type { MenuItemWithRelations } from '@/types';
import Image from 'next/image';

// ============= TYPES =============

interface ChatbotWidgetProps {
  restaurantId: string;
}

// ============= COMPONENT =============

export default function ChatbotWidget({ restaurantId }: ChatbotWidgetProps) {
  // ============= STATE =============
  const CHAT_STORAGE_KEY = 'chatbot-messages';
  const MAX_MESSAGES = 50; // Auto-delete old messages after this limit
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load from localStorage on mount
    const stored = getFromLocalStorage<ChatMessage[]>(CHAT_STORAGE_KEY, []);
    
    // Convert timestamp strings back to Date objects
    const parsedMessages = stored.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
    
    // If no messages, return welcome message
    if (parsedMessages.length === 0) {
      return [
        {
          role: 'assistant' as const,
          content: "Hi! 👋 I'm your AI assistant. I can help you with:",
          timestamp: new Date(),
          type: 'quick_replies' as const,
          data: {
            quickReplies: ['📅 Book a table', '🍽️ See menu', '⭐ Popular dishes', 'ℹ️ Restaurant info'],
          },
        },
      ];
    }
    
    return parsedMessages;
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemWithRelations | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  
  // ============= REFS =============
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ============= EFFECTS =============

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    // Only save if we have messages
    if (messages.length > 0) {
      // Trim messages if exceeding limit (keep most recent)
      const messagesToSave = messages.length > MAX_MESSAGES 
        ? messages.slice(-MAX_MESSAGES) 
        : messages;
      
      setToLocalStorage(CHAT_STORAGE_KEY, messagesToSave);
    }
  }, [messages]);

  // ============= HANDLERS =============

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      type: 'text',
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call AI service
      const response = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          restaurantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        type: data.type || 'text',
        data: data.data,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if booking was created
      if (data.bookingCreated) {
        setBookingCreated(true);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble right now. Please try again or call us directly.",
        timestamp: new Date(),
        type: 'text',
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, restaurantId, sessionId]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleQuickReply = useCallback((reply: string) => {
    setInputValue(reply.replace(/[📅🍽️⭐ℹ️]/g, '').trim());
    // Auto-send after a brief delay to show the input
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  }, [handleSendMessage]);

  const handleMenuItemClick = useCallback((item: MenuItemWithRelations) => {
    setSelectedMenuItem(item);
    setIsMenuModalOpen(true);
  }, []);

  const handleMenuModalClose = useCallback(() => {
    setIsMenuModalOpen(false);
    setSelectedMenuItem(null);
  }, []);

  const handleClearChat = useCallback(() => {
    if (confirm('Clear all chat messages? This cannot be undone.')) {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: "Hi! 👋 I'm your AI assistant. I can help you with:",
        timestamp: new Date(),
        type: 'quick_replies',
        data: {
          quickReplies: ['📅 Book a table', '🍽️ See menu', '⭐ Popular dishes', 'ℹ️ Restaurant info'],
        },
      };
      setMessages([welcomeMessage]);
      setBookingCreated(false);
    }
  }, []);

  const handleAddToCalendar = useCallback((bookingDetails: {
    date: string;
    time: string;
    guests: number;
  }) => {
    // Create .ics file format
    const event = {
      title: 'Restaurant Booking',
      start: new Date(`${bookingDetails.date}T${bookingDetails.time}`),
      duration: 120, // 2 hours
      description: `Table reservation for ${bookingDetails.guests} guests`,
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${event.start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DURATION:PT${event.duration}M
SUMMARY:${event.title}
DESCRIPTION:${event.description}
END:VEVENT
END:VCALENDAR`;

    // Create download link
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'booking.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // ============= RENDER HELPERS =============

  const renderMessage = useCallback((message: ChatMessage, index: number) => {
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex flex-col gap-2',
          message.role === 'user' ? 'items-end' : 'items-start'
        )}
      >
        {/* Regular text message */}
        <div
          className={cn(
            'max-w-[85%] rounded-2xl px-4 py-3',
            'shadow-sm',
            message.role === 'user'
              ? 'rounded-br-sm'
              : 'rounded-bl-sm border'
          )}
          style={
            message.role === 'user'
              ? {
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
                  color: '#ffffff',
                }
              : {
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  borderColor: 'hsl(var(--border))',
                }
          }
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{
            color: message.role === 'user' ? '#ffffff' : 'hsl(var(--foreground))',
          }}>
            {message.content}
          </p>
          <span
            className="text-xs mt-1 block"
            style={{
              color: message.role === 'user'
                ? 'rgba(255, 255, 255, 0.7)'
                : 'hsl(var(--muted-foreground))'
            }}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Quick replies */}
        {message.type === 'quick_replies' && message.data?.quickReplies && (
          <div className="flex flex-wrap gap-2 max-w-[85%]">
            {message.data.quickReplies.map((reply, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleQuickReply(reply)}
                className="text-xs font-medium transition-all hover:scale-105"
                style={{
                  borderColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary))',
                }}
              >
                {reply}
              </Button>
            ))}
          </div>
        )}

        {/* Menu items carousel */}
        {message.type === 'menu_items' && message.data?.menuItems && message.data.menuItems.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 max-w-full scrollbar-hide">
            {message.data.menuItems.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleMenuItemClick(item)}
                className="min-w-[200px] bg-white rounded-xl shadow-md cursor-pointer hover:shadow-xl transition-all border"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                {item.imageUrl ? (
                  <div className="relative h-32 w-full">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover rounded-t-xl"
                      sizes="200px"
                    />
                    {(item.isVegetarian || item.isVegan) && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        {item.isVegan ? 'Vegan' : 'Vegetarian'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-t-xl flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-neutral-400" />
                  </div>
                )}
                <div className="p-3">
                  <h4 className="font-semibold text-sm mb-1 line-clamp-1" style={{ color: 'hsl(var(--foreground))' }}>
                    {item.name}
                  </h4>
                  <p className="text-xs mb-2 line-clamp-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {item.description || 'Delicious dish from our menu'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base" style={{ color: 'hsl(var(--primary))' }}>
                      ${item.price.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      style={{
                        background: 'hsl(var(--primary))',
                        color: '#ffffff',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuItemClick(item);
                      }}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Booking success card */}
        {message.type === 'booking_success' && message.data?.bookingDetails && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-[90%] bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-green-900 text-base">Booking Confirmed! 🎉</h4>
                <p className="text-xs text-green-700 font-medium">#{message.data.bookingDetails.bookingNumber}</p>
              </div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700 font-medium">📅 Date:</span>
                <span className="font-bold text-green-900">
                  {new Date(message.data.bookingDetails.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700 font-medium">🕐 Time:</span>
                <span className="font-bold text-green-900">{message.data.bookingDetails.time}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700 font-medium">👥 Guests:</span>
                <span className="font-bold text-green-900">{message.data.bookingDetails.guests}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                onClick={() => handleAddToCalendar(message.data!.bookingDetails!)}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Add to Calendar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-green-600 text-green-700 hover:bg-green-50"
                onClick={() => {
                  window.open(`/account/bookings`, '_blank');
                }}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View Details
              </Button>
            </div>
            <p className="text-xs text-green-700 mt-3 text-center">
              A confirmation email has been sent to your inbox 📧
            </p>
          </motion.div>
        )}
      </motion.div>
    );
  }, [handleQuickReply, handleMenuItemClick, handleAddToCalendar]);

  // ============= RENDER =============

  return (
    <>
      {/* Menu Item Modal */}
      <MenuItemModal
        item={selectedMenuItem}
        isOpen={isMenuModalOpen}
        onClose={handleMenuModalClose}
      />

      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOpen}
            className={cn(
              'fixed bottom-6 right-6 z-50',
              'w-16 h-16 rounded-full',
              'shadow-lg hover:shadow-2xl',
              'text-white',
              'flex items-center justify-center',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'gentle-pulse'
            )}
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
              boxShadow: '0 4px 14px 0 hsla(var(--primary), 0.5)'
            }}
            aria-label="Open AI assistant chat"
          >
            <MessageCircle className="w-7 h-7" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed bottom-6 right-6 z-50',
              'w-[400px] h-[600px]',
              'rounded-2xl shadow-2xl',
              'flex flex-col overflow-hidden',
              'border'
            )}
            style={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))'
            }}
          >
            {/* Chat Header */}
            <div
              className={cn(
                'px-6 py-4',
                'flex items-center justify-between',
                'relative overflow-hidden'
              )}
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
                color: 'hsl(var(--header-text))'
              }}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12" />
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">AI Assistant</h3>
                  <p className="text-sm text-white/90 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 relative z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  className="h-9 px-3 text-xs hover:bg-white/20"
                  style={{
                    color: 'hsl(var(--header-text))',
                  }}
                  aria-label="Clear chat"
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-9 w-9 hover:bg-white/20"
                  style={{
                    color: 'hsl(var(--header-text))',
                  }}
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ backgroundColor: 'hsl(var(--background))' }}
            >
              {messages.map((message, index) => renderMessage(message, index))}

              {/* Loading Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div
                    className="rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border flex items-center gap-2"
                    style={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))'
                    }}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: 'hsl(var(--primary))',
                          animationDelay: '0ms',
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: 'hsl(var(--primary))',
                          animationDelay: '150ms',
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: 'hsl(var(--primary))',
                          animationDelay: '300ms',
                        }}
                      />
                    </div>
                    <span className="text-sm ml-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      AI is thinking...
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              className="p-4 border-t"
              style={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))'
              }}
            >
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder={bookingCreated ? "Booking completed!" : "Type your message..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading || bookingCreated}
                    className="rounded-xl px-4 py-3 pr-12 border-2 transition-all duration-200 resize-none"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                      e.currentTarget.style.boxShadow = '0 0 0 3px hsla(var(--primary), 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--border))';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {inputValue && !isLoading && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {inputValue.length}
                      </span>
                    </motion.div>
                  )}
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || bookingCreated}
                  size="icon"
                  className="h-12 w-12 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)',
                    color: '#ffffff'
                  }}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {/* Helpful hint */}
              {!bookingCreated && messages.length <= 2 && (
                <p className="text-xs mt-2 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  💡 Try asking: &quot;Show me vegetarian dishes&quot; or &quot;Book a table for 4&quot;
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}