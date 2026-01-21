import Image from 'next/image'
import Link from 'next/link'

interface FooterProps {
  variant?: 'default' | 'members'
}

export default function Footer({ variant = 'default' }: FooterProps) {
  const bgColor = variant === 'members' ? 'bg-[#F5F0EB] dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800'

  return (
    <footer className={bgColor}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6">
          {/* Logo */}
          <div className="mb-8 md:mb-0">
            <Image
              src="/cforc_logo.svg"
              alt="Διακοσμητικό στοιχείο"
              width={160}
              height={64}
              className="w-40 dark:invert"
              aria-hidden="true"
            />
          </div>

          {/* Right columns group */}
          <div className="flex gap-6 md:gap-8">
            {/* Sitemap */}
            <div>
              <h3 className="font-bold mb-3 text-coral dark:text-coral-light text-xs">SITEMAP</h3>
            <ul className="space-y-1.5 text-xs dark:text-gray-300">
              <li><Link href="/members" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΕΥΡΕΣΗ ΜΕΛΩΝ</Link></li>
              <li><Link href="/about" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</Link></li>
              <li><Link href="/activities" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ</Link></li>
              <li><Link href="/open-calls" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ</Link></li>
              <li><Link href="/participation" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΣΥΜΜΕΤΟΧΗ</Link></li>
              <li><Link href="/transparency" className="hover:text-coral dark:hover:text-coral-light transition-colors">ΔΙΑΦΑΝΕΙΑ</Link></li>
            </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-bold mb-3 text-coral dark:text-coral-light text-xs">ΕΠΙΚΟΙΝΩΝΙΑ</h3>
            <ul className="space-y-1.5 text-xs dark:text-gray-300">
              <li>
                <a
                  href="https://www.google.com/maps/place/Leof.+Alexandras+48,+Athina+114+73/@37.9905657,23.7374602,1006m/data=!3m2!1e3!4b1!4m6!3m5!1s0x14a1bd3522c01fef:0x1734422b9fe058ad!8m2!3d37.9905657!4d23.7374602!16s%2Fg%2F11b8v65q35?entry=ttu&g_ep=EgoyMDI1MTEwNC4xIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-coral dark:hover:text-coral-light transition-colors"
                >
                  Λ. Αλεξάνδρας 48, 114 73, Αθήνα
                </a>
              </li>
              <li>
                <a href="mailto:hello@cultureforchange.net" className="hover:text-coral dark:hover:text-coral-light transition-colors">
                  hello@cultureforchange.net
                </a>
              </li>
              <li>
                <a href="tel:+306976225704" className="hover:text-coral dark:hover:text-coral-light transition-colors">
                  +306976225704
                </a>
              </li>
            </ul>
            </div>

            {/* Policy */}
            <div>
              <h3 className="font-bold mb-3 text-coral dark:text-coral-light text-xs">ΠΟΛΙΤΙΚΗ</h3>
            <ul className="space-y-1.5 text-xs dark:text-gray-300">
              <li><Link href="/terms" className="hover:text-coral dark:hover:text-coral-light transition-colors">Όροι & Προϋποθέσεις</Link></li>
              <li><Link href="/privacy" className="hover:text-coral dark:hover:text-coral-light transition-colors">Πολιτική Απορρήτου</Link></li>
              <li><Link href="/cookies" className="hover:text-coral dark:hover:text-coral-light transition-colors">Πολιτική Cookies</Link></li>
            </ul>
            </div>

            {/* Social Media Icons */}
            <div className="relative" style={{marginRight: '-0.15em'}}>
              <h3 className="font-bold mb-3 text-coral dark:text-coral-light text-xs text-right">SOCIAL MEDIA</h3>
              <div className="grid grid-cols-2 gap-3 justify-items-end">
                <a href="https://www.linkedin.com/company/culture-for-change-gr/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/linkedin-icon-lg.png" alt="LinkedIn" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
                <a href="https://www.facebook.com/cultureforchange" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/facebook-icon-lg.png" alt="Facebook" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
                <a href="https://www.instagram.com/culture_for_change/" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/instagram-icon-lg.png" alt="Instagram" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
                <a href="https://www.youtube.com/channel/UCKFq7TQlenx36UPc3F63Opw" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/youtube-icon-lg.png" alt="YouTube" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
                <a href="https://vimeo.com/user165582483" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity w-6 h-6 flex items-center justify-center">
                  <Image src="/vimeo-square-icon-md.png" alt="Vimeo" width={24} height={24} className="dark:invert w-full h-full object-contain" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-300 dark:border-gray-600 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-700 dark:text-gray-400">
          <p>ΠΝΕΥΜΑΤΙΚΑ ΔΙΚΑΙΩΜΑΤΑ © 2025 CULTURE FOR CHANGE</p>
          <p className="mt-2 md:mt-0">
            Developed by <a href="https://yoryosstyl.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-coral dark:hover:text-coral-light transition-colors">Yoryos Styl</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
