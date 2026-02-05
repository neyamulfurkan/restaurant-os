// src/app/(customer)/checkout/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MapPin, Clock, Utensils, ChevronDown, ChevronUp } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useSession } from 'next-auth/react';
import { useSettingsStore } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ORDER_TYPE, PAYMENT_METHOD } from '@/lib/constants';
import type { OrderType, PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';

import { toast } from 'sonner';

// Checkout form schema
const checkoutFormSchema = z.object({
  orderType: z.enum([ORDER_TYPE.DINE_IN, ORDER_TYPE.PICKUP, ORDER_TYPE.DELIVERY]),
  tableNumber: z.string().optional(),
  pickupTime: z.string().optional(),
  deliveryStreet: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryState: z.string().optional(),
  deliveryZipCode: z.string().optional(),
  deliveryCountry: z.string().default('US'),
  phone: z.string().optional(),
  paymentMethod: z.enum([
    PAYMENT_METHOD.STRIPE,
    PAYMENT_METHOD.PAYPAL,
    PAYMENT_METHOD.CASH,
  ]),
  tipPercentage: z.number().min(0).max(100),
  promoCode: z.string().optional(),
  specialInstructions: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.orderType === ORDER_TYPE.DINE_IN && !data.tableNumber) {
      return false;
    }
    return true;
  },
  {
    message: 'Table number is required for dine-in orders',
    path: ['tableNumber'],
  }
).refine(
  (data) => {
    if (data.orderType === ORDER_TYPE.PICKUP && !data.pickupTime) {
      return false;
    }
    return true;
  },
  {
    message: 'Pickup time is required for pickup orders',
    path: ['pickupTime'],
  }
).refine(
  (data) => {
    if (data.orderType === ORDER_TYPE.DELIVERY) {
      return data.deliveryStreet && data.deliveryCity && data.deliveryState && data.deliveryZipCode;
    }
    return true;
  },
  {
    message: 'Complete delivery address is required',
    path: ['deliveryStreet'],
  }
).refine(
  (data) => {
    if (data.orderType === ORDER_TYPE.DELIVERY && !data.phone) {
      return false;
    }
    return true;
  },
  {
    message: 'Phone number is required for delivery orders',
    path: ['phone'],
  }
);

type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

// Tip percentages
const TIP_OPTIONS = [
  { label: 'No Tip', value: 0 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
  { label: 'Custom', value: -1 },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, isEmpty } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  // Client-side only mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect if cart is empty (client-side only)
  useEffect(() => {
    if (isMounted && isEmpty) {
      toast.error('Your cart is empty');
      router.push('/menu');
    }
  }, [isEmpty, router, isMounted]);

  // Show loading state during hydration
  if (!isMounted) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Show empty state after hydration
  if (isEmpty) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Your cart is empty</h2>
          <p className="text-neutral-600 mb-6">Add some items to your cart to checkout</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-3xl font-bold text-neutral-900 mb-8">Checkout</h1>
        
        <div className="grid lg:grid-cols-2 gap-8">
          <CheckoutForm />
          
          <OrderSummary 
            items={items}
            subtotal={subtotal}
          />
        </div>
      </div>
    </div>
  );
}

function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { data: session } = useSession();
  const { restaurantId } = useSettingsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [stripeCardElement, setStripeCardElement] = useState<any>(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [cardError, setCardError] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      orderType: ORDER_TYPE.DELIVERY,
      tipPercentage: 15,
      paymentMethod: PAYMENT_METHOD.STRIPE,
      deliveryCountry: 'US',
    },
  });

  const orderType = watch('orderType');
  const tipPercentage = watch('tipPercentage');
  const paymentMethod = watch('paymentMethod');
  const deliveryZipCode = watch('deliveryZipCode');

  // Clear fields when order type changes
  useEffect(() => {
    if (orderType === ORDER_TYPE.DINE_IN) {
      // Clear pickup and delivery fields
      setValue('pickupTime', undefined);
      setValue('deliveryStreet', undefined);
      setValue('deliveryCity', undefined);
      setValue('deliveryState', undefined);
      setValue('deliveryZipCode', undefined);
    } else if (orderType === ORDER_TYPE.PICKUP) {
      // Clear dine-in and delivery fields
      setValue('tableNumber', undefined);
      setValue('deliveryStreet', undefined);
      setValue('deliveryCity', undefined);
      setValue('deliveryState', undefined);
      setValue('deliveryZipCode', undefined);
    } else if (orderType === ORDER_TYPE.DELIVERY) {
      // Clear dine-in and pickup fields
      setValue('tableNumber', undefined);
      setValue('pickupTime', undefined);
    }
  }, [orderType, setValue]);

  // Calculate pricing
  const taxRate = 0.08; // 8% tax (should come from settings)
  const taxAmount = subtotal * taxRate;
  const tipAmount = tipPercentage >= 0 ? (subtotal * tipPercentage) / 100 : 0;
  const totalAmount = subtotal + taxAmount + deliveryFee + tipAmount;

  // Check delivery zone when zip code changes
  useEffect(() => {
    if (orderType === ORDER_TYPE.DELIVERY && deliveryZipCode && deliveryZipCode.length >= 5) {
      checkDeliveryZone(deliveryZipCode);
    }
  }, [deliveryZipCode, orderType]);

  // Initialize Stripe card element when payment method is card
  useEffect(() => {
    if (paymentMethod === PAYMENT_METHOD.STRIPE && stripeLoaded && !stripeCardElement) {
      const stripe = (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');
      const elements = stripe.elements();
      const cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#9e2146',
          },
        },
      });
      cardElement.mount('#card-element');
      cardElement.on('change', (event: any) => {
        setCardError(event.error ? event.error.message : '');
      });
      setStripeCardElement(cardElement);
    }

    // Cleanup
    return () => {
      if (stripeCardElement) {
        stripeCardElement.unmount();
        setStripeCardElement(null);
      }
    };
  }, [paymentMethod, stripeLoaded]);

  const checkDeliveryZone = async (zipCode: string) => {
    try {
      const response = await fetch(`/api/delivery-zones/check?zipCode=${zipCode}`);
      const data = await response.json();

      if (data.success) {
        setDeliveryFee(data.deliveryFee);
        setEstimatedDeliveryTime(data.estimatedTime);
        setIsAddressValid(true);
      } else {
        // Allow checkout even if zip code not in delivery zone (for testing)
        setDeliveryFee(5.00); // Default delivery fee
        setEstimatedDeliveryTime('30-45 mins'); // Default time
        setIsAddressValid(true); // Enable button anyway
        console.warn('Zip code not in delivery zone, using defaults');
      }
    } catch (error) {
      console.error('Delivery zone check error:', error);
      // Allow checkout even on API error (for testing)
      setDeliveryFee(5.00);
      setEstimatedDeliveryTime('30-45 mins');
      setIsAddressValid(true);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    console.log('✅ onSubmit called with data:', data);
    console.log('Session:', session);
    console.log('Restaurant ID from settings store:', restaurantId);
    console.log('Is restaurantId valid?', !!restaurantId);
    setIsSubmitting(true);

    try {
      console.log('✅ Starting order creation process...');
      console.log('Cart items:', items);
      console.log('Subtotal:', subtotal);
      
      if (!session?.user?.id && !restaurantId) {
        console.error('❌ Missing session or restaurant ID');
        throw new Error('Please log in to place an order');
      }
      
      // Prepare order data
      const orderData: {
        type: OrderType;
        customerId: string;
        restaurantId: string;
        items: Array<{
          menuItemId: string;
          name: string;
          price: number;
          quantity: number;
          customizations?: unknown;
          specialInstructions?: string;
        }>;
        subtotal: number;
        taxAmount: number;
        serviceFee: number;
        tipAmount: number;
        discountAmount: number;
        totalAmount: number;
        deliveryFee: number;
        paymentMethod: PaymentMethod;
        specialInstructions?: string;
        tableNumber?: string;
        pickupTime?: string;
        deliveryAddress?: {
          street: string;
          city: string;
          state: string;
          zipCode: string;
          country: string;
        };
      } = {
        type: data.orderType,
        customerId: session?.user?.id || 'cml4leh920001tn7k3z7sddwm',
         restaurantId: restaurantId || 'rest123456789',
        items: items.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          customizations: item.customizations,
          specialInstructions: item.specialInstructions,
        })),
        subtotal,
        taxAmount,
        serviceFee: 0,
        tipAmount,
        discountAmount: 0,
        totalAmount,
        deliveryFee,
        paymentMethod: data.paymentMethod,
        specialInstructions: data.specialInstructions,
      };

      // Add type-specific fields
      if (data.orderType === ORDER_TYPE.DINE_IN) {
        orderData.tableNumber = data.tableNumber;
      } else if (data.orderType === ORDER_TYPE.PICKUP) {
        orderData.pickupTime = data.pickupTime;
      } else if (data.orderType === ORDER_TYPE.DELIVERY) {
        orderData.deliveryAddress = {
          street: data.deliveryStreet!,
          city: data.deliveryCity!,
          state: data.deliveryState!,
          zipCode: data.deliveryZipCode!,
          country: data.deliveryCountry,
        };
      }

      // Handle different payment methods
      if (data.paymentMethod === PAYMENT_METHOD.PAYPAL) {
        // PayPal payment flow
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        const orderResult = await orderResponse.json();

        if (!orderResult.success) {
          throw new Error(orderResult.error || 'Order creation failed');
        }

        // Create PayPal order
        const paypalResponse = await fetch('/api/payments/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            currency: 'USD',
            orderId: orderResult.data.id,
          }),
        });

        const paypalData = await paypalResponse.json();

        if (!paypalData.success || !paypalData.data.approveUrl) {
          throw new Error(paypalData.error || 'PayPal payment setup failed');
        }

        // Show development mode notice if applicable
        if (paypalData.isDevelopmentMode) {
          console.log('🧪 DEVELOPMENT MODE: Simulating PayPal redirect');
          toast.success('Development Mode: PayPal payment simulated');
          
          // In dev mode, skip PayPal redirect and go straight to success
          clearCart();
          toast.success('Order placed successfully! (Development Mode)');
          router.push(`/order-tracking/${orderResult.data.id}`);
          return;
        }

        // Redirect to PayPal approval page
        window.location.href = paypalData.data.approveUrl;
        return;

     } else if (data.paymentMethod === PAYMENT_METHOD.STRIPE) {
        // Skip Stripe validation for now - will be handled in order creation
        console.log('Stripe payment selected - skipping for testing');

        // Create payment intent
        const paymentResponse = await fetch('/api/payments/stripe/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(totalAmount * 100), // Convert to cents
            currency: 'usd',
            orderId: 'temp-order-id', // Will be replaced after order creation
            customerId: session?.user?.id,
            customerEmail: session?.user?.email,
          }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentData.success) {
          throw new Error(paymentData.error || 'Payment setup failed');
        }

        // Show development mode notice if applicable
        if (paymentData.isDevelopmentMode) {
          console.log('🧪 DEVELOPMENT MODE: Simulating Stripe payment');
          toast.success('Development Mode: Payment simulated successfully');
          // Continue to create order below
        } else {
          // Production mode - Confirm card payment
          const stripe = (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
          const { error: confirmError } = await stripe.confirmCardPayment(
            paymentData.data.clientSecret,
            {
              payment_method: {
                card: stripeCardElement,
                billing_details: {
                  name: session?.user?.name || 'Guest',
                  email: session?.user?.email,
                },
              },
            }
          );

          if (confirmError) {
            throw new Error(confirmError.message || 'Payment failed');
          }

          toast.success('Payment successful!');
          // Continue to create order below
        }
      }

      // Log the order data before sending
      console.log('=== ORDER DATA BEING SENT ===');
      console.log(JSON.stringify(orderData, null, 2));
      console.log('=== END ORDER DATA ===');

      // Create order for CASH and STRIPE (PayPal already handled above with return)

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const orderResult = await orderResponse.json();
      
      console.log('=== ORDER API RESPONSE ===');
      console.log('Status:', orderResponse.status);
      console.log('Response:', JSON.stringify(orderResult, null, 2));
      console.log('=== END RESPONSE ===');

      if (!orderResult.success) {
        console.error('❌ Order creation failed');
        console.error('Error:', orderResult.error);
        console.error('Details:', orderResult.details);
        
        // Show detailed error to user
        const errorMessage = orderResult.details 
          ? `${orderResult.error}: ${JSON.stringify(orderResult.details)}`
          : orderResult.error || 'Order creation failed';
        
        throw new Error(errorMessage);
      }

      // Clear cart and redirect to order tracking
      clearCart();
      toast.success('Order placed successfully!');
      router.push(`/order-tracking/${orderResult.data.id}`);

    } catch (error) {
      console.error('❌❌❌ CHECKOUT ERROR ❌❌❌');
      console.error('Error type:', typeof error);
      console.error('Error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      toast.error(error instanceof Error ? error.message : 'An error occurred during checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
        onSubmit={(e) => {
          e.preventDefault();
          console.log('Form onSubmit called');
          console.log('Form errors:', errors);
          console.log('Form is valid:', Object.keys(errors).length === 0);
          handleSubmit(
            (data) => {
              console.log('✅ Form validation passed!');
              onSubmit(data);
            },
            (errors) => {
              console.error('❌ Form validation FAILED:');
              console.error('Validation errors:', errors);
              toast.error('Please fill in all required fields');
            }
          )(e);
        }} 
        className="space-y-6"
        noValidate
      >
      {/* Order Type Selector */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Order Type</h2>
        
        <div className="grid grid-cols-3 gap-3">
          {[
            { type: ORDER_TYPE.DINE_IN, icon: Utensils, label: 'Dine-In' },
            { type: ORDER_TYPE.PICKUP, icon: Clock, label: 'Pickup' },
            { type: ORDER_TYPE.DELIVERY, icon: MapPin, label: 'Delivery' },
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('orderType', type)}
              className={cn(
                'flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200',
                orderType === type
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              )}
            >
              <Icon className={cn(
                'w-6 h-6 mb-2',
                orderType === type ? 'text-primary-600' : 'text-neutral-600'
              )} />
              <span className={cn(
                'font-medium text-sm',
                orderType === type ? 'text-primary-600' : 'text-neutral-600'
              )}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Type-specific fields */}
        <AnimatePresence mode="wait">
          {orderType === ORDER_TYPE.DINE_IN && (
            <motion.div
              key="dine-in"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Table Number
              </label>
              <Input
                {...register('tableNumber')}
                placeholder="Enter table number"
                className={cn(errors.tableNumber && 'border-error-500')}
              />
              {errors.tableNumber && (
                <p className="text-error-500 text-sm mt-1">{errors.tableNumber.message}</p>
              )}
            </motion.div>
          )}

          {orderType === ORDER_TYPE.PICKUP && (
            <motion.div
              key="pickup"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Preferred Pickup Time
              </label>
              <Input
                {...register('pickupTime')}
                type="datetime-local"
                className={cn(errors.pickupTime && 'border-error-500')}
              />
              {errors.pickupTime && (
                <p className="text-error-500 text-sm mt-1">{errors.pickupTime.message}</p>
              )}
            </motion.div>
          )}

          {orderType === ORDER_TYPE.DELIVERY && (
            <motion.div
              key="delivery"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Street Address
                </label>
                <Input
                  {...register('deliveryStreet')}
                  placeholder="123 Main St"
                  className={cn(errors.deliveryStreet && 'border-error-500')}
                />
                {errors.deliveryStreet && (
                  <p className="text-error-500 text-sm mt-1">{errors.deliveryStreet.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    City
                  </label>
                  <Input
                    {...register('deliveryCity')}
                    placeholder="City"
                    className={cn(errors.deliveryCity && 'border-error-500')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    State
                  </label>
                  <Input
                    {...register('deliveryState')}
                    placeholder="State"
                    className={cn(errors.deliveryState && 'border-error-500')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Zip Code
                  </label>
                  <Input
                    {...register('deliveryZipCode')}
                    placeholder="12345"
                    className={cn(errors.deliveryZipCode && 'border-error-500')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone
                  </label>
                  <Input
                    {...register('phone')}
                    type="tel"
                    placeholder="(555) 123-4567"
                    className={cn(errors.phone && 'border-error-500')}
                  />
                </div>
              </div>

              {estimatedDeliveryTime && isAddressValid && (
                <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                  <p className="text-success-700 text-sm">
                    Estimated delivery time: {estimatedDeliveryTime}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Load Stripe.js */}
      <Script
        src="https://js.stripe.com/v3/"
        onLoad={() => setStripeLoaded(true)}
      />

      {/* Payment Method */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Payment Method</h2>
        
        <div className="space-y-3">
          {[
            { method: PAYMENT_METHOD.STRIPE, label: 'Credit/Debit Card' },
            { method: PAYMENT_METHOD.PAYPAL, label: 'PayPal' },
            { method: PAYMENT_METHOD.CASH, label: 'Cash on Delivery/Pickup' },
          ].map(({ method, label }) => (
            <button
              key={method}
              type="button"
              onClick={() => setValue('paymentMethod', method)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200',
                paymentMethod === method
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              )}
            >
              <span className={cn(
                'font-medium',
                paymentMethod === method ? 'text-primary-600' : 'text-neutral-700'
              )}>
                {label}
              </span>
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                paymentMethod === method
                  ? 'border-primary-500'
                  : 'border-neutral-300'
              )}>
                {paymentMethod === method && (
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Stripe Card Input */}
        {paymentMethod === PAYMENT_METHOD.STRIPE && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border-2 border-neutral-200 p-4">
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Card Details
              </label>
              <div id="card-element" className="p-3 border border-neutral-300 rounded-lg bg-white"></div>
              {cardError && (
                <p className="text-sm text-error-500 mt-2">{cardError}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Your payment is secured by Stripe</span>
            </div>
          </div>
        )}
      </div>

      {/* Tip Selection */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Add Tip</h2>
        
        <div className="grid grid-cols-5 gap-3">
          {TIP_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('tipPercentage', value)}
              className={cn(
                'p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium',
                tipPercentage === value
                  ? 'border-primary-500 bg-primary-50 text-primary-600'
                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tipPercentage === -1 && (
          <div className="mt-4">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter custom tip amount"
              onChange={(e) => setValue('tipPercentage', parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
      </div>

      {/* Special Instructions */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Special Instructions</h2>
        
        <textarea
          {...register('specialInstructions')}
          placeholder="Any special requests or dietary restrictions?"
          rows={4}
          className="w-full px-4 py-3 border-2 border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-lg transition-colors duration-200 placeholder:text-neutral-400 resize-none"
        />
        {errors.specialInstructions && (
          <p className="text-error-500 text-sm mt-1">{errors.specialInstructions.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {paymentMethod === PAYMENT_METHOD.PAYPAL ? 'Redirecting to PayPal...' : 'Processing...'}
          </>
        ) : (
          <>
            {paymentMethod === PAYMENT_METHOD.PAYPAL ? 'Continue to PayPal' : `Place Order`} - ${totalAmount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

interface OrderSummaryProps {
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    customizations?: Array<{ optionName: string }>;
  }>;
  subtotal: number;
}

function OrderSummary({ items, subtotal }: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const taxRate = 0.08;
  const taxAmount = subtotal * taxRate;
  const deliveryFee = 5.00; // TODO: Calculate based on zone
  const tipAmount = subtotal * 0.15;
  const totalAmount = subtotal + taxAmount + deliveryFee + tipAmount;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 lg:sticky lg:top-24 h-fit">
      <h2 className="text-xl font-semibold text-neutral-900 mb-4">Order Summary</h2>

      {/* Items List */}
      <div className="space-y-3 mb-4">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-neutral-700 hover:text-neutral-900 transition-colors"
        >
          <span className="font-medium">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 pt-2 border-t border-neutral-200"
            >
              {items.map((item: { menuItemId: string; quantity: number; name: string; customizations?: Array<{ optionName: string }>; price: number }) => (
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900">
                      {item.quantity}x {item.name}
                    </p>
                    {item.customizations && item.customizations.length > 0 && (
                      <p className="text-neutral-500 text-xs mt-1">
                        {item.customizations.map((c: any) => c.optionName).join(', ')}
                      </p>
                    )}
                  </div>
                  <p className="font-medium text-neutral-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pricing Breakdown */}
      <div className="space-y-3 py-4 border-t border-neutral-200">
        <div className="flex justify-between text-neutral-700">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-neutral-700">
          <span>Tax</span>
          <span>${taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-neutral-700">
          <span>Delivery Fee</span>
          <span>${deliveryFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-neutral-700">
          <span>Tip (15%)</span>
          <span>${tipAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
        <span className="text-lg font-bold text-neutral-900">Total</span>
        <span className="text-2xl font-bold text-primary-600">${totalAmount.toFixed(2)}</span>
      </div>
    </div>
  );
}