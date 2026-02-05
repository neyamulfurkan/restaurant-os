// src/app/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { QrCode, Truck, MapPin, ArrowRight } from 'lucide-react';
import { Header } from '@/components/customer/Header';
import { CartSidebar } from '@/components/customer/CartSidebar';
import Footer from '@/components/customer/Footer';
import PopularItemsCarousel from '@/components/customer/PopularItemsCarousel';
import ChatbotWidget from '@/components/customer/ChatbotWidget';
import { GallerySection } from '@/components/customer/GallerySection';
import { AboutSection } from '@/components/customer/AboutSection';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store/settingsStore';
import { useRouter } from 'next/navigation';
import { MenuItemWithRelations } from '@/types';
import { useCart } from '@/hooks/useCart';

export default function HomePage() {
  const router = useRouter();
  const content = {
    story: useSettingsStore.getState().aboutStory || undefined,
    mission: useSettingsStore.getState().aboutMission || undefined,
    values: useSettingsStore.getState().aboutValues || undefined,
  };
  const { restaurantName } = useSettingsStore();
  const { addItem } = useCart();
  const [isClient, setIsClient] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Ensure animations only run on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle add to cart from carousel
  const handleAddToCart = (item: MenuItemWithRelations) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
    });
  };

  // Handle item click from carousel
  const handleItemClick = (item: MenuItemWithRelations) => {
    router.push(`/menu?item=${item.id}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
      <Header onCartOpen={() => setIsCartOpen(true)} />

      {/* Hero Section */}
      <section className="relative min-h-[100svh] h-screen flex items-center justify-center overflow-hidden">
        {/* Background Media */}
        <HeroMedia />

        {/* Parallax effect container */}
        <div className="relative z-10 container mx-auto px-4 max-w-4xl text-center">
          {isClient && (
            <>
              {/* Restaurant Name with slide-up animation */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 sm:mb-6 px-4"
              >
                {restaurantName}
              </motion.h1>

              {/* Tagline with fade-in animation */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                className="text-base sm:text-lg md:text-2xl text-white/90 font-light mb-8 sm:mb-12 px-4"
              >
                Experience culinary excellence delivered to your doorstep
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4 sm:px-0"
              >
                <Button
                  asChild
                  size="lg"
                  className="
                    bg-primary hover:bg-primary/90
                    text-primary-foreground font-semibold
                    px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg
                    shadow-xl hover:shadow-2xl
                    transition-all duration-300
                    group w-full sm:w-auto
                  "
                >
                  <Link href="/menu">
                    Order Now
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="
                    border-2 border-white text-white
                    hover:bg-white
                    font-semibold px-6 py-4 sm:px-8 sm:py-6 text-base sm:text-lg
                    backdrop-blur-sm bg-white/10
                    transition-all duration-300
                    group w-full sm:w-auto
                  "
                  style={{
                    ['--hover-text-color' as string]: 'hsl(var(--foreground))'
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'white';
                  }}
                >
                  <Link href="/booking">
                    Book a Table
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                </Button>
              </motion.div>

              {/* QR Code Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9, ease: 'easeOut' }}
                className="mt-8 sm:mt-12 md:mt-16 flex flex-col items-center gap-4"
              >
                <QRCodeSection />
              </motion.div>
            </>
          )}
        </div>

        {/* Scroll indicator */}
        {isClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 hidden sm:block"
          >
            <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center p-2">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 bg-white/70 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </section>

      {/* Features Section */}
      <section className="py-24" style={{ backgroundColor: 'hsl(var(--page-bg))' }}>
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Card 1: QR Ordering */}
            <motion.div
              initial={{ opacity: 0, x: -80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="
                rounded-2xl p-8
                shadow-md hover:shadow-xl
                border border-neutral-100
                transition-all duration-300
                hover:-translate-y-2
                group
              "
              style={{ backgroundColor: 'hsl(var(--card))' }}
            >
              <div className="
                w-16 h-16 rounded-xl
                bg-primary
                flex items-center justify-center
                mb-6
                group-hover:scale-110 transition-transform duration-300
              ">
                <QrCode className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
                QR Ordering
              </h3>
              <p className="leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                Scan, browse our menu, and place your order in seconds. No app download required.
              </p>
            </motion.div>

            {/* Feature Card 2: Fast Delivery */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              className="
                rounded-2xl p-8
                shadow-md hover:shadow-xl
                border border-neutral-100
                transition-all duration-300
                hover:-translate-y-2
                group
              "
              style={{ backgroundColor: 'hsl(var(--card))' }}
            >
              <div className="
                w-16 h-16 rounded-xl
                bg-success-500
                flex items-center justify-center
                mb-6
                group-hover:scale-110 transition-transform duration-300
              ">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
                Fast Delivery
              </h3>
              <p className="leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                Hot, fresh food delivered to your door in 30 minutes or less. Guaranteed.
              </p>
            </motion.div>

            {/* Feature Card 3: Real-Time Tracking */}
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
              className="
                rounded-2xl p-8
                shadow-md hover:shadow-xl
                border border-neutral-100
                transition-all duration-300
                hover:-translate-y-2
                group
              "
              style={{ backgroundColor: 'hsl(var(--card))' }}
            >
              <div className="
                w-16 h-16 rounded-xl
                bg-accent
                flex items-center justify-center
                mb-6
                group-hover:scale-110 transition-transform duration-300
              ">
                <MapPin className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
                Real-Time Tracking
              </h3>
              <p className="leading-relaxed" style={{ color: 'hsl(var(--foreground) / 0.7)' }}>
                Track your order from kitchen to doorstep with live updates every step of the way.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Popular Items Carousel */}
      <PopularItemsCarousel
        onAddToCart={handleAddToCart}
        onItemClick={handleItemClick}
      />

      {/* Gallery Section */}
      {isClient && useSettingsStore.getState().showGalleryOnHome && (useSettingsStore.getState().galleryImages || []).length > 0 && (
        <GallerySection 
          images={useSettingsStore.getState().galleryImages || []} 
          categories={useSettingsStore.getState().galleryCategories || ['All']}
        />
      )}

      {/* About Section */}
      {isClient && (content.story || content.mission || content.values) && (
        <AboutSection
          content={{
            story: content.story,
            mission: content.mission,
            values: content.values,
          }}
        />
      )}

      {/* Footer */}
      <Footer />

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* AI Chatbot Widget */}
      <ChatbotWidget restaurantId="rest123456789" />
    </div>
  );
  }

// Hero Media Component
function HeroMedia() {
  const { branding } = useSettingsStore();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Determine media type
  const mediaType = branding.heroMediaType || 'image';
  const hasSlideshow = mediaType === 'slideshow' && branding.heroImages && branding.heroImages.length > 0;
  const hasVideo = mediaType === 'video' && branding.heroVideoUrl;
  const hasSingleImage = mediaType === 'image' && branding.heroImageUrl;

  // Auto-advance slideshow
  useEffect(() => {
    if (hasSlideshow && branding.heroImages!.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % branding.heroImages!.length);
      }, branding.heroSlideshowInterval || 5000);
      return () => clearInterval(interval);
    }
  }, [hasSlideshow, branding.heroImages, branding.heroSlideshowInterval]);

  // Parse video URL
  const getVideoEmbedUrl = (url: string) => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be/')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return {
        type: 'youtube',
        url: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`,
      };
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return {
        type: 'vimeo',
        url: `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1&controls=0`,
      };
    }
    
    // Dailymotion
    if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
      const videoId = url.includes('dai.ly/')
        ? url.split('dai.ly/')[1]?.split('?')[0]
        : url.split('/video/')[1]?.split('?')[0];
      return {
        type: 'dailymotion',
        url: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=1&loop=1&controls=0`,
      };
    }
    
    // Facebook Video
    if (url.includes('facebook.com')) {
      return {
        type: 'facebook',
        url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=1`,
      };
    }
    
    // Direct video file
    return {
      type: 'direct',
      url: url,
    };
  };

  // Video rendering
  if (hasVideo) {
    const videoData = getVideoEmbedUrl(branding.heroVideoUrl!);
    
    // Get video thumbnail
    const getVideoThumbnail = (url: string, type: string) => {
      if (type === 'youtube') {
        const videoId = url.includes('youtu.be/')
          ? url.split('youtu.be/')[1]?.split('?')[0]
          : url.split('v=')[1]?.split('&')[0];
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
      if (type === 'vimeo') {
        // Vimeo requires API call, use default image
        return branding.heroImageUrl || '/images/hero-bg.jpg';
      }
      // For other types, use fallback
      return branding.heroImageUrl || '/images/hero-bg.jpg';
    };

    const thumbnailUrl = getVideoThumbnail(branding.heroVideoUrl!, videoData.type);

    if (videoData.type === 'direct') {
      return (
        <div className="absolute inset-0 z-0">
          {!isVideoLoaded && (
            <Image
              src={thumbnailUrl}
              alt="Video thumbnail"
              fill
              priority
              className="object-cover"
              quality={90}
            />
          )}
          <video
            autoPlay
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onCanPlayThrough={() => setIsVideoLoaded(true)}
          >
            <source src={videoData.url} type="video/mp4" />
            <source src={videoData.url} type="video/webm" />
          </video>
          <div className="absolute inset-0 bg-black/60" />
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-0">
        {/* Thumbnail placeholder */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 z-0">
            <Image
              src={thumbnailUrl}
              alt="Video thumbnail"
              fill
              priority
              className="object-cover"
              quality={90}
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
              </div>
            </div>
          </div>
        )}
        
        {/* Video iframe */}
        <iframe
          src={videoData.url}
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-1000 ${
            isVideoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ border: 'none', transform: 'scale(1.2)' }}
          allow="autoplay; fullscreen"
          onLoad={() => setTimeout(() => setIsVideoLoaded(true), 2000)}
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
    );
  }

  // Slideshow rendering with continuous Ken Burns effect
  if (hasSlideshow) {
    const getAnimationStyle = (index: number, isActive: boolean) => {
      const patterns = [
        { from: 'scale(1.1) translate(0%, 0%)', to: 'scale(1.3) translate(-8%, -5%)' },
        { from: 'scale(1.1) translate(0%, 0%)', to: 'scale(1.3) translate(8%, 5%)' },
        { from: 'scale(1.1) translate(-5%, -3%)', to: 'scale(1.3) translate(5%, 3%)' },
        { from: 'scale(1.1) translate(5%, 3%)', to: 'scale(1.3) translate(-5%, -3%)' },
        { from: 'scale(1.1) translate(0%, -5%)', to: 'scale(1.3) translate(0%, 5%)' },
        { from: 'scale(1.1) translate(-8%, 0%)', to: 'scale(1.3) translate(8%, 0%)' },
      ];
      
      const pattern = patterns[index % patterns.length];
      return isActive ? pattern.to : pattern.from;
    };

    return (
      <div className="absolute inset-0 z-0 overflow-hidden">
        {branding.heroImages!.map((img, index) => {
          const isActive = index === currentSlideIndex;
          const animationDuration = (branding.heroSlideshowInterval || 5000) * 2;
          
          return (
            <div
              key={`${img}-${index}`}
              className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
                isActive ? 'opacity-100 z-20' : 'opacity-0 z-10'
              }`}
            >
              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  transform: getAnimationStyle(index, false),
                  animation: isActive ? `kenBurns${index} ${animationDuration}ms ease-in-out infinite alternate` : 'none',
                }}
              >
                <Image
                  src={img}
                  alt={`Hero slide ${index + 1}`}
                  fill
                  priority={index === 0 || index === 1}
                  className="object-cover"
                  quality={95}
                  sizes="100vw"
                />
              </div>
            </div>
          );
        })}
        
        {/* Dynamic gradient overlay with subtle animation */}
        <div className="absolute inset-0 z-30">
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60 animate-pulse-slow" />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-black/20 animate-gradient" />
        </div>
        
        {/* Slideshow indicators with animated progress */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 flex gap-3">
          {branding.heroImages!.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlideIndex(index)}
              className="relative group"
              aria-label={`Go to slide ${index + 1}`}
            >
              <div
                className={`relative overflow-hidden transition-all duration-300 rounded-full ${
                  index === currentSlideIndex
                    ? 'w-16 h-3 bg-white/30 backdrop-blur-sm shadow-lg'
                    : 'w-3 h-3 bg-white/40 group-hover:bg-white/60 group-hover:w-6'
                }`}
              >
                {index === currentSlideIndex && (
                  <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full"
                    style={{
                      animation: `slideProgress ${branding.heroSlideshowInterval || 5000}ms linear`,
                      width: '0%',
                    }}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
        
        <style jsx>{`
          @keyframes kenBurns0 {
            0% { transform: scale(1.1) translate(0%, 0%); }
            100% { transform: scale(1.3) translate(-8%, -5%); }
          }
          @keyframes kenBurns1 {
            0% { transform: scale(1.1) translate(0%, 0%); }
            100% { transform: scale(1.3) translate(8%, 5%); }
          }
          @keyframes kenBurns2 {
            0% { transform: scale(1.1) translate(-5%, -3%); }
            100% { transform: scale(1.3) translate(5%, 3%); }
          }
          @keyframes kenBurns3 {
            0% { transform: scale(1.1) translate(5%, 3%); }
            100% { transform: scale(1.3) translate(-5%, -3%); }
          }
          @keyframes kenBurns4 {
            0% { transform: scale(1.1) translate(0%, -5%); }
            100% { transform: scale(1.3) translate(0%, 5%); }
          }
          @keyframes kenBurns5 {
            0% { transform: scale(1.1) translate(-8%, 0%); }
            100% { transform: scale(1.3) translate(8%, 0%); }
          }
          
          @keyframes slideProgress {
            from { width: 0%; }
            to { width: 100%; }
          }
          
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          
          @keyframes gradient {
            0% { opacity: 0.3; }
            50% { opacity: 0.6; }
            100% { opacity: 0.3; }
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 8s ease-in-out infinite;
          }
          
          .animate-gradient {
            animation: gradient 10s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // Fallback: Single image with parallax
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 scale-110">
        <Image
          src={hasSingleImage ? branding.heroImageUrl! : '/images/hero-bg.jpg'}
          alt="Restaurant hero background"
          fill
          priority
          className="object-cover"
          quality={95}
          sizes="100vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
    </div>
  );
}

// QR Code Display Component (moved outside HomePage)
function QRCodeSection() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    // Generate QR code for menu page
    const generateQR = async () => {
      try {
        const baseUrl = window.location.origin;
        const menuUrl = `${baseUrl}/menu`;
        console.log('Generating QR code for:', menuUrl);
        
        const response = await fetch(`/api/qr/generate?url=${encodeURIComponent(menuUrl)}`);
        const data = await response.json();
        
        console.log('QR generation response:', data);
        
        if (data.success && data.qrCode) {
          setQrCode(data.qrCode);
          console.log('QR code set successfully');
        } else {
          console.error('QR generation failed:', data);
        }
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQR();
  }, []);

  return (
    <>
      {/* Professional: Click to show QR modal */}
      <button
        onClick={() => setShowQR(true)}
        className="flex items-center gap-2 text-white/80 hover:text-white transition-all duration-200 group"
        disabled={!qrCode}
      >
        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-200">
          <QrCode className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <span className="text-sm font-medium">Scan to Order</span>
      </button>

      {/* QR Code Modal */}
      {showQR && qrCode && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-300"
          onClick={() => setShowQR(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Scan to Order</h3>
              <button
                onClick={() => setShowQR(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                aria-label="Close"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex justify-center mb-6 bg-gray-50 rounded-xl p-6">
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            </div>
            
            <p className="text-center text-gray-600 mb-6">
              Point your camera at the QR code to access our menu instantly
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowQR(false)}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
              <Button
                asChild
                className="flex-1"
              >
                <Link href="/menu">
                  View Menu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}