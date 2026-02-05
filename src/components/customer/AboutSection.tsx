'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Target, Award } from 'lucide-react';
import { AboutContent } from '@/types';
import { useSettingsStore } from '@/store/settingsStore';

interface AboutSectionProps {
  content: AboutContent;
}

export function AboutSection({ content }: AboutSectionProps) {
  const { branding, aboutStoryImage, aboutMissionImage, aboutValuesImage } = useSettingsStore();
  
  if (!content.story && !content.mission && !content.values) {
    return null;
  }

  const sections = [
    {
      icon: Heart,
      title: 'Our Story',
      content: content.story,
      color: branding.primaryColor || '#0ea5e9',
      image: aboutStoryImage || '/images/about-story.jpg',
    },
    {
      icon: Target,
      title: 'Our Mission',
      content: content.mission,
      color: '#10b981',
      image: aboutMissionImage || '/images/about-mission.jpg',
    },
    {
      icon: Award,
      title: 'Our Values',
      content: content.values,
      color: branding.accentColor || '#ef4444',
      image: aboutValuesImage || '/images/about-values.jpg',
    },
  ].filter(section => section.content);

  if (sections.length === 0) return null;

  // Helper function to add opacity to hex color
  const hexToRGBA = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const textColor = branding.bodyTextColor || '#171717';
  const bgColor = branding.bodyColor || '#ffffff';

  return (
    <section
      className="py-24"
      style={{ backgroundColor: bgColor }}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            style={{ color: textColor }}
          >
            About Us
          </h2>
          <p
            className="text-lg md:text-xl max-w-2xl mx-auto"
            style={{ color: hexToRGBA(textColor, 0.7) }}
          >
            Discover what makes us unique
          </p>
        </motion.div>

        {/* Content Sections - Alternating Layout */}
        <div className="space-y-24">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isEven = index % 2 === 0;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: isEven ? -80 : 80 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`flex flex-col ${
                  isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                } gap-12 items-center`}
              >
                {/* Image */}
                <div className="w-full lg:w-1/2">
                  <motion.div 
                    className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Image
                      src={section.image}
                      alt={section.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.src.startsWith('data:')) {
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="18"%3EImage unavailable%3C/text%3E%3C/svg%3E';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Icon Overlay */}
                    <div className="absolute bottom-8 left-8">
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-2xl"
                        style={{ backgroundColor: hexToRGBA(section.color, 0.25) }}
                      >
                        <Icon className="w-10 h-10 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Text Content */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="w-full lg:w-1/2 space-y-6"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="inline-flex items-center gap-3 px-5 py-2 rounded-full"
                    style={{
                      backgroundColor: hexToRGBA(section.color, 0.15),
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: section.color }} />
                    <span
                      className="text-sm font-bold tracking-wide uppercase"
                      style={{ color: section.color }}
                    >
                      {section.title}
                    </span>
                  </motion.div>

                  <h3
                    className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
                    style={{ color: textColor }}
                  >
                    {section.title === 'Our Story' && 'How It All Began'}
                    {section.title === 'Our Mission' && 'What Drives Us'}
                    {section.title === 'Our Values' && 'What We Stand For'}
                  </h3>

                  <p
                    className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap"
                    style={{ color: hexToRGBA(textColor, 0.8) }}
                  >
                    {section.content}
                  </p>

                  {/* Decorative Line */}
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="h-1 rounded-full max-w-xs"
                    style={{ backgroundColor: section.color }}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}