import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6">
          {/* Logo */}
          <div className="mb-8 md:mb-0">
            <Image
              src="/cforc_logo.svg"
              alt="Culture for Change Logo"
              width={160}
              height={64}
              className="w-40"
            />
          </div>

          {/* Right columns group */}
          <div className="flex gap-6 md:gap-8">
            {/* Sitemap */}
            <div>
              <h3 className="font-bold mb-3 text-coral text-xs">SITEMAP</h3>
            <ul className="space-y-1.5 text-xs">
              <li><Link href="/find-members" className="hover:text-coral transition-colors">ΕΥΡΕΣΗ ΜΕΛΩΝ</Link></li>
              <li><Link href="/about" className="hover:text-coral transition-colors">ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</Link></li>
              <li><Link href="/activities" className="hover:text-coral transition-colors">ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ</Link></li>
              <li><Link href="/open-calls" className="hover:text-coral transition-colors">ΑΝΟΙΧΤΑ ΚΑΛΕΣΜΑΤΑ</Link></li>
              <li><Link href="/membership" className="hover:text-coral transition-colors">ΣΥΜΜΕΤΟΧΗ</Link></li>
              <li><Link href="/transparency" className="hover:text-coral transition-colors">ΔΙΑΦΑΝΕΙΑ</Link></li>
            </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-bold mb-3 text-coral text-xs">ΕΠΙΚΟΙΝΩΝΙΑ</h3>
            <ul className="space-y-1.5 text-xs">
              <li>Λ.ΑΛΕΞΑΝΔΡΑΣ 48, 11473, ΑΘΗΝΑ</li>
              <li>
                <a href="mailto:HELLO@CULTUREFORCHANGE.NET" className="hover:text-coral transition-colors">
                  HELLO@CULTUREFORCHANGE.NET
                </a>
              </li>
              <li>
                <a href="tel:+306976225704" className="hover:text-coral transition-colors">
                  +306976225704
                </a>
              </li>
            </ul>
            </div>

            {/* Policy */}
            <div>
              <h3 className="font-bold mb-3 text-coral text-xs">ΠΟΛΙΤΙΚΗ</h3>
            <ul className="space-y-1.5 text-xs">
              <li><Link href="/terms" className="hover:text-coral transition-colors">ΟΡΟΙ & ΠΡΟΫΠΟΘΕΣΕΙΣ</Link></li>
              <li><Link href="/privacy" className="hover:text-coral transition-colors">ΠΟΛΙΤΙΚΗ ΑΠΟΡΡΗΤΟΥ</Link></li>
              <li><Link href="/cookies" className="hover:text-coral transition-colors">ΠΟΛΙΤΙΚΗ COOKIES</Link></li>
            </ul>
            </div>

            {/* Social Media - aligned with Yoryos Styl */}
            <div className="relative" style={{marginRight: '-0.15em'}}>
              <h3 className="font-bold mb-3 text-coral text-xs text-right">SOCIAL MEDIA</h3>
              <ul className="space-y-1.5 text-xs text-right">
                <li>
                  <a href="https://www.linkedin.com/company/cultureforchange" target="_blank" rel="noopener noreferrer" className="hover:text-coral transition-colors">
                    LINKED IN
                  </a>
                </li>
                <li>
                  <a href="https://www.facebook.com/cultureforchange" target="_blank" rel="noopener noreferrer" className="hover:text-coral transition-colors">
                    FACEBOOK
                  </a>
                </li>
                <li>
                  <a href="https://www.instagram.com/cultureforchange" target="_blank" rel="noopener noreferrer" className="hover:text-coral transition-colors">
                    INSTAGRAM
                  </a>
                </li>
                <li>
                  <a href="https://www.youtube.com/cultureforchange" target="_blank" rel="noopener noreferrer" className="hover:text-coral transition-colors">
                    YOUTUBE
                  </a>
                </li>
                <li>
                  <a href="https://vimeo.com/cultureforchange" target="_blank" rel="noopener noreferrer" className="hover:text-coral transition-colors">
                    VIMEO
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-300 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-700">
          <p>ΠΝΕΥΜΑΤΙΚΑ ΔΙΚΑΙΩΜΑΤΑ © 2025 CULTURE FOR CHANGE</p>
          <p className="mt-2 md:mt-0">
            Developed by <a href="https://yoryosstyl.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-coral transition-colors">Yoryos Styl</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
