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
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="text-coral text-sm font-medium mb-4">ΣΥΝΕΡΓΑΣΙΑ</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            ΟΙ ΥΠΟΣΤΗΡΙΚΤΕΣ ΜΑΣ
          </h2>
        </div>

        {/* Grid Layout */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left Column - Supporters */}
          <div className="lg:col-span-1">
            {supporters.map((supporter, index) => (
              <div key={index} className="text-center">
                <div className="bg-white p-4 rounded-lg mb-3 flex items-center justify-center h-32">
                  <Image
                    src={supporter.logo}
                    alt={supporter.alt}
                    width={200}
                    height={80}
                    className="max-h-20 w-auto object-contain"
                  />
                </div>
                <p className="text-sm font-bold">{supporter.type}</p>
              </div>
            ))}
          </div>

          {/* Right Column - Members (3 columns) */}
          <div className="lg:col-span-3 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {members.map((member, index) => (
              <div key={index} className="text-center">
                <div className="bg-white p-4 rounded-lg mb-3 flex items-center justify-center h-32">
                  <Image
                    src={member.logo}
                    alt={member.alt}
                    width={200}
                    height={80}
                    className="max-h-20 w-auto object-contain"
                  />
                </div>
                <p className="text-sm font-bold">ΜΕΛΟΣ</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
