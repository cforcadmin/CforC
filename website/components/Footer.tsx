export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo and description */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <g transform="translate(50, 50)">
                    {[...Array(12)].map((_, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1="-30"
                        x2="0"
                        y2="-35"
                        stroke="currentColor"
                        strokeWidth="2"
                        transform={`rotate(${i * 30})`}
                      />
                    ))}
                  </g>
                </svg>
              </div>
              <div className="text-xs font-bold leading-tight">
                <div>CULTURE</div>
                <div>FOR</div>
                <div>CHANGE</div>
              </div>
            </div>
          </div>

          {/* Sitemap */}
          <div>
            <h3 className="font-bold mb-4 text-coral">SITEMAP</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-coral transition-colors">ΕΥΡΕΣΗ ΜΕΛΩΝ</a></li>
              <li><a href="#" className="hover:text-coral transition-colors">ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ</a></li>
              <li><a href="#" className="hover:text-coral transition-colors">ΔΡΑΣΤΗΡΙΟΤΗΤΕΣ</a></li>
              <li><a href="#" className="hover:text-coral transition-colors">ΑΝΟΙΧΤΑ ΚΑΛΕΣΜΑΤΑ</a></li>
              <li><a href="#" className="hover:text-coral transition-colors">ΣΥΜΜΕΤΟΧΗ</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4 text-coral">ΕΠΙΚΟΙΝΩΝΙΑ</h3>
            <ul className="space-y-2 text-sm">
              <li>ΕΥΡΕΣΗ ΜΕΛΩΝ 14/73, ΑΘΗΝΑ</li>
              <li><a href="mailto:HELLO@CULTUREFORCHANGE.NET" className="hover:text-coral transition-colors">
                HELLO@CULTUREFORCHANGE.NET
              </a></li>
              <li>+306979329704</li>
            </ul>
          </div>

          {/* Policy & Social */}
          <div>
            <h3 className="font-bold mb-4 text-coral">ΠΟΛΙΤΙΚΗ</h3>
            <ul className="space-y-2 text-sm mb-6">
              <li><a href="#" className="hover:text-coral transition-colors">ΟΡΟΙ & ΠΡΟΫΠΟΘΕΣΕΙΣ</a></li>
              <li><a href="#" className="hover:text-coral transition-colors">ΠΟΛΙΤΙΚΗ ΑΠΟΡΡΗΤΟΥ</a></li>
              <li><a href="#" className="hover:text-coral transition-colors">ΠΟΛΙΤΙΚΗ COOKIES</a></li>
            </ul>

            <h3 className="font-bold mb-4 text-coral">SOCIAL MEDIA</h3>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-coral transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-coral transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-coral transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <p>ΠΝΕΥΜΑΤΙΚΑ ΔΙΚΑΙΩΜΑΤΑ © 2025 CULTURE FOR CHANGE</p>
          <p>DESIGN BY <span className="font-medium">NEATIV</span> DEVELOPED BY <span className="font-medium">DYNATOUCH</span></p>
        </div>
      </div>
    </footer>
  )
}
