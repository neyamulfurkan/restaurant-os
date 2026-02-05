// src/components/customer/Footer.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

export default function Footer() {
  const { 
    restaurantName, 
    email, 
    phone, 
    address, 
    branding 
  } = useSettingsStore();

  const currentYear = new Date().getFullYear();

  return (
    <footer 
      style={{ 
        backgroundColor: branding.footerBgColor,
        color: branding.footerTextColor 
      }}
    >
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 
              className="text-lg font-bold mb-4"
              style={{ color: branding.footerTextColor }}
            >
              About Us
            </h3>
            <p 
              className="text-sm opacity-80"
              style={{ color: branding.footerTextColor }}
            >
              {restaurantName} - Experience the finest dining with our carefully crafted menu and exceptional service.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 
              className="text-lg font-bold mb-4"
              style={{ color: branding.footerTextColor }}
            >
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/menu" 
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: branding.footerTextColor }}
                >
                  Menu
                </Link>
              </li>
              <li>
                <Link 
                  href="/booking" 
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: branding.footerTextColor }}
                >
                  Bookings
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: branding.footerTextColor }}
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link 
                  href="/account/orders" 
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: branding.footerTextColor }}
                >
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 
              className="text-lg font-bold mb-4"
              style={{ color: branding.footerTextColor }}
            >
              Contact Info
            </h3>
            <ul className="space-y-3 text-sm">
              {phone && (
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <a 
                    href={`tel:${phone}`}
                    className="hover:opacity-80 transition-opacity"
                    style={{ color: branding.footerTextColor }}
                  >
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <a 
                    href={`mailto:${email}`}
                    className="hover:opacity-80 transition-opacity"
                    style={{ color: branding.footerTextColor }}
                  >
                    {email}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span style={{ color: branding.footerTextColor }}>
                    {address}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 
              className="text-lg font-bold mb-4"
              style={{ color: branding.footerTextColor }}
            >
              Follow Us
            </h3>
            <div className="flex gap-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="Facebook"
              >
                <Facebook className="w-6 h-6" style={{ color: branding.footerTextColor }} />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" style={{ color: branding.footerTextColor }} />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="Twitter"
              >
                <Twitter className="w-6 h-6" style={{ color: branding.footerTextColor }} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div 
          className="mt-8 pt-8 border-t border-opacity-20 text-center text-sm"
          style={{ 
            borderColor: branding.footerTextColor,
            color: branding.footerTextColor 
          }}
        >
          <p className="opacity-80">
            © {currentYear} {restaurantName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}