import Image from 'next/image'

interface BlurredImageProps {
  src: string
  alt: string
  className?: string
}

export default function BlurredImage({ src, alt, className = 'aspect-video' }: BlurredImageProps) {
  return (
    <div className={`${className} overflow-hidden relative bg-gray-200 dark:bg-gray-700`}>
      {/* Blurred background fill */}
      <Image
        src={src}
        alt=""
        fill
        className="object-cover blur-xl scale-110 opacity-70 dark:opacity-50"
        aria-hidden="true"
      />
      {/* Actual image */}
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain relative z-10"
      />
    </div>
  )
}
