// src/components/customer/CartSidebar.tsx

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const router = useRouter();
  const {
    items,
    subtotal,
    isEmpty,
    updateQuantity,
    removeItem,
  } = useCart();

  // Calculate delivery fee (placeholder - would come from settings/delivery zone)
  const deliveryFee = subtotal >= 50 ? 0 : 5;
  
  // Calculate tax (placeholder - would come from settings)
  const taxRate = 0.08; // 8%
  const taxAmount = subtotal * taxRate;
  
  // Calculate total
  const total = subtotal + deliveryFee + taxAmount;

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  const handleContinueShopping = () => {
    onClose();
    router.push('/menu');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 shadow-2xl z-50 flex flex-col"
            style={{ backgroundColor: 'hsl(var(--card))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Your Cart</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                aria-label="Close cart"
              >
                <X className="w-6 h-6" style={{ color: 'hsl(var(--foreground) / 0.7)' }} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isEmpty ? (
                // Empty state
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="w-16 h-16 text-neutral-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    Your cart is empty
                  </h3>
                  <p className="mb-6" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Add items to get started
                  </p>
                  <Button onClick={handleContinueShopping}>
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.menuItemId}
                      className="flex gap-4 pb-4 border-b"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      {/* Item Image */}
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-neutral-400" />
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                          {item.name}
                        </h3>
                        
                        {/* Customizations */}
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.customizations.map((custom, index) => (
                              <p
                                key={index}
                                className="text-sm"
                                style={{ color: 'hsl(var(--foreground) / 0.6)' }}
                              >
                                {custom.groupName}: {custom.optionName}
                                {custom.price > 0 && ` (+${formatCurrency(custom.price)})`}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Special Instructions */}
                        {item.specialInstructions && (
                          <p className="mt-1 text-sm italic" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                            Note: {item.specialInstructions}
                          </p>
                        )}

                        {/* Price and Quantity Controls */}
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                            {formatCurrency(item.price * item.quantity)}
                          </p>

                          {/* Quantity Adjuster */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                              className="p-1 hover:bg-neutral-100 rounded-md transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" style={{ color: 'hsl(var(--foreground) / 0.7)' }} />
                            </button>
                            
                            <span className="w-8 text-center font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                              {item.quantity}
                            </span>
                            
                            <button
                              onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                              className="p-1 hover:bg-neutral-100 rounded-md transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" style={{ color: 'hsl(var(--foreground) / 0.7)' }} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.menuItemId)}
                        className="p-2 hover:bg-red-50 rounded-md transition-colors self-start"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5 text-red-500 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary Section (sticky bottom) */}
            {!isEmpty && (
              <div className="border-t px-6 py-4" style={{ 
                borderColor: 'hsl(var(--border))',
                backgroundColor: 'hsl(var(--muted))'
              }}>
                <div className="space-y-2 mb-4">
                  {/* Subtotal */}
                  <div className="flex justify-between" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  {/* Delivery Fee */}
                  <div className="flex justify-between" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    <span>
                      Delivery fee
                      {deliveryFee === 0 && (
                        <span className="text-green-600 text-sm ml-1">
                          (Free)
                        </span>
                      )}
                    </span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>

                  {/* Tax */}
                  <div className="flex justify-between" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t" style={{ 
                    color: 'hsl(var(--foreground))',
                    borderColor: 'hsl(var(--border))'
                  }}>
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
                  >
                    Proceed to Checkout
                  </Button>
                  
                  <Button
                    onClick={handleContinueShopping}
                    variant="outline"
                    className="w-full border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-semibold py-3 rounded-lg transition-all duration-200"
                  >
                    Continue Shopping
                  </Button>
                </div>

                {/* Free delivery notice */}
                {subtotal > 0 && subtotal < 50 && (
                  <p className="text-sm text-center mt-3" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Add {formatCurrency(50 - subtotal)} more for free delivery
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}