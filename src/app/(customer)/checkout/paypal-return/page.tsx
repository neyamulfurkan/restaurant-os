'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

export default function PayPalReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const capturePayment = async () => {
      const token = searchParams.get('token'); // PayPal order ID
      const payerID = searchParams.get('PayerID');
      const orderIdParam = searchParams.get('orderId');

      if (!token || !orderIdParam) {
        setStatus('error');
        return;
      }

      try {
        const response = await fetch('/api/payments/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderIdParam,
            paypalOrderId: token,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setOrderId(orderIdParam);
          clearCart();
          
          // Redirect to order tracking after 2 seconds
          setTimeout(() => {
            router.push(`/order-tracking/${orderIdParam}`);
          }, 2000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('PayPal capture error:', error);
        setStatus('error');
      }
    };

    capturePayment();
  }, [searchParams, router, clearCart]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        {status === 'processing' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary-500 animate-spin" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Processing Payment</h2>
            <p className="text-neutral-600">Please wait while we confirm your payment...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Payment Successful!</h2>
            <p className="text-neutral-600 mb-6">Your order has been placed successfully.</p>
            <p className="text-sm text-neutral-500">Redirecting to order tracking...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-error-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Payment Failed</h2>
            <p className="text-neutral-600 mb-6">There was an error processing your payment.</p>
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/checkout')}
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => router.push('/menu')}
                variant="outline"
                className="w-full"
              >
                Back to Menu
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}