'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye, Images } from 'lucide-react';
import { GalleryItem } from '@/types';
import { Button } from '@/components/ui/button';

interface GallerySectionProps {
  images: GalleryItem[];
  categories?: string[];
}

export function GallerySection({ images, categories = ['All'] }: GallerySectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !images || images.length === 0) {
    return null;
  }

  // Get featured images for homepage
  const featuredImages = images.filter(img => img.isFeatured);

  // Filter images by category (for modal)
  const filteredImages = activeCategory === 'All' 
    ? images 
    : images.filter(img => img.category === activeCategory);

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handlePrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + filteredImages.length) % filteredImages.length);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % filteredImages.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedIndex(null);
      setShowAllModal(false);
    } else if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  return (
    <>
      {/* Homepage Section - Featured Gallery */}
      <section
        className="py-24"
        style={{ backgroundColor: 'hsl(var(--page-bg))' }}
      >
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Our Gallery
            </h2>
            <p
              className="text-lg md:text-xl max-w-2xl mx-auto"
              style={{ color: 'hsl(var(--foreground) / 0.7)' }}
            >
              Explore our culinary artistry and ambiance
            </p>
          </motion.div>

          {/* Featured Images - Alternating Layout */}
          <div className="space-y-24">
            {featuredImages.slice(0, 3).map((item, index) => {
              const isEven = index % 2 === 0;
              
              return (
                <motion.div
                  key={`featured-${item.url}-${index}`}
                  initial={{ opacity: 0, x: isEven ? -80 : 80 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`flex flex-col ${
                    isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  } gap-12 items-center`}
                >
                  {/* Image */}
                  <div className="w-full lg:w-1/2 relative group cursor-pointer"
                    onClick={() => {
                      const allFeaturedIndex = images.findIndex(img => img.url === item.url);
                      handleImageClick(allFeaturedIndex >= 0 ? allFeaturedIndex : index);
                    }}
                  >
                    <motion.div 
                      className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Image
                        src={item.url}
                        alt={item.caption || `Gallery image ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <Eye className="w-16 h-16 text-white drop-shadow-lg" />
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
                    {item.category && item.category !== 'All' && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="inline-block px-5 py-2 rounded-full text-sm font-bold tracking-wide uppercase"
                        style={{
                          backgroundColor: 'hsl(var(--primary) / 0.15)',
                          color: 'hsl(var(--primary))',
                        }}
                      >
                        {item.category}
                      </motion.span>
                    )}
                    
                    {item.caption ? (
                      <h3
                        className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {item.caption}
                      </h3>
                    ) : (
                      <h3
                        className="text-2xl md:text-3xl lg:text-4xl font-bold leading-relaxed"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        Crafted with Passion
                      </h3>
                    )}

                    <p
                      className="text-lg md:text-xl leading-relaxed"
                      style={{ color: 'hsl(var(--foreground) / 0.7)' }}
                    >
                      {item.caption 
                        ? "Every detail is carefully curated to create an unforgettable dining experience."
                        : "Experience the artistry and passion that goes into every dish we create, from the finest ingredients to the perfect presentation."
                      }
                    </p>

                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      <Button
                        onClick={() => {
                          const allFeaturedIndex = images.findIndex(img => img.url === item.url);
                          handleImageClick(allFeaturedIndex >= 0 ? allFeaturedIndex : index);
                        }}
                        variant="outline"
                        size="lg"
                        className="mt-4 group border-2"
                        style={{
                          borderColor: 'hsl(var(--primary))',
                          color: 'hsl(var(--primary))',
                        }}
                      >
                        View Full Image
                        <Eye className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* View All Button */}
          {images.length > featuredImages.length && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mt-20"
            >
              <Button
                onClick={() => setShowAllModal(true)}
                size="lg"
                className="px-10 py-6 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 group transform hover:-translate-y-1"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
              >
                <Images className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                View All {images.length} Photos
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Full Gallery Modal */}
      <AnimatePresence>
        {showAllModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/95 z-50 overflow-y-auto p-4"
            onClick={() => setShowAllModal(false)}
          >
            <div className="container mx-auto max-w-7xl py-8">
              {/* Close Button */}
              <button
                onClick={() => setShowAllModal(false)}
                className="fixed top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Modal Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-8"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Our Gallery
                </h2>
                <p className="text-white/70">
                  {activeCategory !== 'All' ? `${activeCategory} - ` : ''}
                  {filteredImages.length} {filteredImages.length === 1 ? 'Photo' : 'Photos'}
                </p>
              </motion.div>

              {/* Category Tabs */}
              {categories.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex flex-wrap justify-center gap-3 mb-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  {categories.map((category, index) => (
                    <motion.button
                      key={category}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                      onClick={() => setActiveCategory(category)}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                        activeCategory === category
                          ? 'bg-white text-black shadow-lg scale-105'
                          : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
                      }`}
                    >
                      {category}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Images Grid */}
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                onClick={(e) => e.stopPropagation()}
              >
                <AnimatePresence mode="popLayout">
                  {filteredImages.map((item, index) => (
                    <motion.div
                      key={`${item.url}-${index}`}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setShowAllModal(false);
                        setSelectedIndex(index);
                      }}
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={item.url}
                          alt={item.caption || `Gallery image ${index + 1}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Eye className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      {item.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-white text-sm line-clamp-2">
                            {item.caption}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* No Images Message */}
              {filteredImages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <p className="text-white/60 text-lg">
                    No images in this category
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Image Viewer Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Previous Button */}
            {filteredImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
            )}

            {/* Image */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-6xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={filteredImages[selectedIndex].url}
                alt={filteredImages[selectedIndex].caption || `Gallery image ${selectedIndex + 1}`}
                width={1200}
                height={800}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
              {filteredImages[selectedIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                  <p className="text-white text-center text-lg">
                    {filteredImages[selectedIndex].caption}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Next Button */}
            {filteredImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
              {selectedIndex + 1} / {filteredImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}