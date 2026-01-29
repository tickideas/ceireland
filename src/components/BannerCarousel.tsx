'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'

interface Banner {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string | null
  active: boolean
  order: number
}

interface BannerCarouselProps {
  banners: Banner[]
  priorityFirst?: boolean
}

export default function BannerCarousel({ banners, priorityFirst = false }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const activeBanners = useMemo(() => 
    banners.filter(banner => banner.active).sort((a, b) => a.order - b.order),
    [banners]
  )

  useEffect(() => {
    if (activeBanners.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === activeBanners.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [activeBanners.length])

  // Reset image state when slide changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [currentIndex])

  if (activeBanners.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No announcements at this time.
      </div>
    )
  }

  const currentBanner = activeBanners[currentIndex]

  return (
    <div className="relative">
      {/* Banner Image */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[24/9] overflow-hidden rounded-lg bg-gray-100">
        {currentBanner.linkUrl ? (
          <a 
            href={currentBanner.linkUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block w-full h-full"
          >
            {!imageError ? (
              <Image
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                priority={priorityFirst && currentIndex === 0}
                className={`object-cover object-center transition-transform duration-300 ${imageLoaded ? 'hover:scale-105' : ''}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  console.error('[BannerCarousel] Failed to load image:', currentBanner.imageUrl)
                  setImageError(true)
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Image src="/globe.svg" alt="announcement" width={64} height={64} className="opacity-60" />
              </div>
            )}
            {/* light overlay only after image loads */}
            {imageLoaded && (
              <div className="absolute inset-0 bg-black/10 hover:bg-black/20 transition-all duration-300"></div>
            )}
          </a>
        ) : (
          <>
            {!imageError ? (
              <Image
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                priority={priorityFirst && currentIndex === 0}
                className="object-cover object-center"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  console.error('[BannerCarousel] Failed to load image:', currentBanner.imageUrl)
                  setImageError(true)
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Image src="/globe.svg" alt="announcement" width={64} height={64} className="opacity-60" />
              </div>
            )}
            {imageLoaded && (
              <div className="absolute inset-0 bg-black/10"></div>
            )}
          </>
        )}
        
        {/* Banner Title */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
          <h3 className="text-white text-sm sm:text-lg font-semibold line-clamp-2">
            {currentBanner.title}
          </h3>
        </div>
      </div>

      {/* Navigation Dots */}
      {activeBanners.length > 1 && (
        <div className="flex justify-center mt-3 sm:mt-4 gap-2 sm:gap-2">
          {activeBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors touch-manipulation ${
                index === currentIndex ? 'bg-blue-700' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Navigation Arrows */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex(prev => prev === 0 ? activeBanners.length - 1 : prev - 1)}
            className="absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 bg-white/60 hover:bg-white/80 active:bg-white/90 rounded-full p-1.5 sm:p-2 transition-all touch-manipulation"
            aria-label="Previous banner"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentIndex(prev => prev === activeBanners.length - 1 ? 0 : prev + 1)}
            className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-white/60 hover:bg-white/80 active:bg-white/90 rounded-full p-1.5 sm:p-2 transition-all touch-manipulation"
            aria-label="Next banner"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
