// src/app/(customer)/contact/page.tsx

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [settings, setSettings] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch restaurant settings
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string || undefined,
        subject: formData.get('subject') as string,
        message: formData.get('message') as string,
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      toast({
        title: "Message Sent Successfully!",
        description: "We'll get back to you shortly!",
      });
      
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: "Failed to Send Message",
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12" style={{ backgroundColor: 'hsl(var(--page-bg))', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="mb-4 text-center text-4xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Contact Us
        </h1>
        <p className="mb-12 text-center text-lg" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
          Have a question? We'd love to hear from you.
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start">
                <Phone className="mr-4 h-6 w-6 flex-shrink-0 text-primary-600" />
                <div>
                  <h3 className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Phone</h3>
                  <p className="mt-1" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    {isLoading ? 'Loading...' : settings?.phone || '+1 (234) 567-8900'}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    Mon-Fri from 9am to 9pm
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start">
                <Mail className="mr-4 h-6 w-6 flex-shrink-0 text-primary-600" />
                <div>
                  <h3 className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Email</h3>
                  <p className="mt-1" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    {isLoading ? 'Loading...' : settings?.email || 'contact@restaurant.com'}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: 'hsl(var(--foreground) / 0.6)' }}>
                    We'll respond within 24 hours
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start">
                <MapPin className="mr-4 h-6 w-6 flex-shrink-0 text-primary-600" />
                <div>
                  <h3 className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Address</h3>
                  <p className="mt-1" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    {isLoading ? 'Loading...' : (
                      <>
                        {settings?.address || '123 Restaurant Street'}
                        <br />
                        {settings?.city || 'New York'}, {settings?.state || 'NY'} {settings?.zipCode || '10001'}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start">
                <Clock className="mr-4 h-6 w-6 flex-shrink-0 text-primary-600" />
                <div>
                  <h3 className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Hours</h3>
                  <div className="mt-2 space-y-1 text-sm" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                    {isLoading ? (
                      <p>Loading...</p>
                    ) : settings?.operatingHours ? (
                      <>
                        {Object.entries(settings.operatingHours as Record<string, any>).map(([day, hours]: [string, any]) => (
                          <p key={day} className="capitalize">
                            {day}: {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                          </p>
                        ))}
                      </>
                    ) : (
                      <>
                        <p>Monday - Friday: 11am - 10pm</p>
                        <p>Saturday - Sunday: 10am - 11pm</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="p-6">
            <h2 className="mb-6 text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Send us a Message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Phone (Optional)
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (234) 567-8900"
                />
              </div>

              <div>
                <label htmlFor="subject" className="mb-1 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Subject
                </label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium" style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                  Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  placeholder="Tell us more about your inquiry..."
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}