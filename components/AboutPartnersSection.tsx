import Image from 'next/image'

const supporters = [
  {
    logo: '/about-us-iac-berlin-logo.png',
    alt: 'iac Berlin',
    type: 'ΥΠΟΣΤΗΡΙΞΗ',
  },
]

const members = [
  {
    logo: '/about-us-cae-logo.png',
    alt: 'Culture Action Europe',
  },
  {
    logo: '/about-us-BAN-logo.png',
    alt: 'Bosch Alumni Network',
  },
  {
    logo: '/about-us-ALF-logo.png',
    alt: 'Anna Lindh Foundation',
  },
  {
    logo: '/about-us-ENCC-logo.png',
    alt: 'European Network of Cultural Centres',
  },
  {
    logo: '/about-us-posibilists-logo.png',
    alt: 'The Possibilists',
  },
  {
    logo: '/about-us-CAN-logo.png',
    alt: 'Community Arts Network',
  },
  {
    logo: '/about-us-reset-logo.PNG',
    alt: 'Reset Network',
  },
]

export default function AboutPartnersSection() {
  return (
    <section className="py-16 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight dark:text-gray-100">
            ΟΙ ΥΠΟΣΤΗΡΙΚΤΕΣ ΚΑΙ ΟΙ ΣΥΝΕΡΓΑΤΕΣ ΜΑΣ
          </h2>
        </div>

        {/* Grid Layout */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left Column - Supporters (1/4) */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold mb-6 dark:text-gray-100">Με την υποστήριξη του:</h3>
            {supporters.map((supporter, index) => (
              <div key={index} className="text-center">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg flex items-center justify-center">
                  <Image
                    src={supporter.logo}
                    alt={supporter.alt}
                    width={250}
                    height={100}
                    className="w-auto h-auto object-contain"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Right Column - Members (3/4) */}
          <div className="lg:col-span-3">
            <h3 className="text-lg font-bold mb-6 dark:text-gray-100">Το δίκτυο CforC είναι μέλος των:</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Specific order as requested */}
              <div className="text-center">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg flex items-center justify-center h-40">
                  <Image
                    src="/about-us-cae-logo.png"
                    alt="Culture Action Europe"
                    width={200}
                    height={100}
                    className="w-auto max-h-32 object-contain"
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg flex items-center justify-center h-40">
                  <Image
                    src="/about-us-BAN-logo.png"
                    alt="Bosch Alumni Network"
                    width={200}
                    height={100}
                    className="w-auto max-h-32 object-contain"
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg flex items-center justify-center h-40">
                  <Image
                    src="/about-us-ENCC-logo.png"
                    alt="European Network of Cultural Centres"
                    width={200}
                    height={100}
                    className="w-auto max-h-32 object-contain"
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg flex items-center justify-center h-40">
                  <Image
                    src="/about-us-ALF-logo.png"
                    alt="Ίδρυμα Anna Lind"
                    width={200}
                    height={100}
                    className="w-auto max-h-32 object-contain"
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg flex items-center justify-center h-40">
                  <Image
                    src="/about-us-reset-logo.PNG"
                    alt="Reset Network"
                    width={200}
                    height={100}
                    className="w-auto max-h-32 object-contain"
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg flex items-center justify-center h-40">
                  <Image
                    src="/about-us-posibilists-logo.png"
                    alt="Possibilists"
                    width={200}
                    height={100}
                    className="w-auto max-h-32 object-contain"
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white dark:bg-gray-700 p-6 rounded-lg flex items-center justify-center h-40">
                  <Image
                    src="/about-us-CAN-logo.png"
                    alt="Community Arts Network"
                    width={200}
                    height={100}
                    className="w-auto max-h-32 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
