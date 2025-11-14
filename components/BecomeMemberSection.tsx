import Link from 'next/link'
import Image from 'next/image'

export default function BecomeMemberSection() {
  return (
    <section className="relative h-[45vh] min-h-[400px] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/becomeamember.webp"
          alt="Landscape background"
          fill
          className="object-cover"
          priority={false}
        />
        {/* Overlay for better text contrast */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        {/* Coral Box */}
        <div className="bg-coral/95 dark:bg-gradient-to-r dark:from-gray-700/95 dark:to-gray-800/95 rounded-3xl px-8 py-10 md:px-12 md:py-12 max-w-4xl w-full shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Text Content */}
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-charcoal dark:text-gray-100 mb-4">
                ΓΙΝΕ ΜΕΛΟΣ ΤΟΥ<br />
                ΔΙΚΤΥΟΥ ΜΑΣ
              </h2>
              <p className="text-charcoal/90 dark:text-gray-200 text-sm md:text-base max-w-xl">
                Γίνε τώρα μέλος του πρώτου Δικτύου για την κοινωνική και πολιτιστική καινοτομία στην Ελλάδα.
              </p>
            </div>

            {/* Button */}
            <div className="flex-shrink-0">
              <Link
                href="/membership"
                className="inline-block bg-transparent border-2 border-coral dark:border-coral-light text-coral dark:text-coral-light px-8 py-3 rounded-full font-medium hover:bg-coral hover:text-white dark:hover:bg-coral-light dark:hover:text-gray-900 transition-all duration-300"
              >
                ΓΙΝΕ ΜΕΛΟΣ ΤΩΡΑ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
