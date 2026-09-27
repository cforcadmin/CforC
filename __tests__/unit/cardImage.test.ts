import { campaignEmailHtml, BLOCK_VARIANTS } from '@/lib/campaignBlocks'

const card = (extra: Record<string, unknown> = {}) => campaignEmailHtml({
  subject: 'Δοκιμή',
  blocks: [{ type: 'card', title: 'Τίτλος', html: '<p>ΣΩΜΑ-ΚΑΡΤΑΣ</p>', ...extra }] as any,
}).html

const PIC = 'https://example.com/p.png'

describe('Κάρτα δράσης — θέση και μέγεθος εικόνας', () => {
  it('όλες οι θέσεις του μενού αποδίδονται και δείχνουν την εικόνα', () => {
    const positions = BLOCK_VARIANTS.card!.options.map(o => o.value)
    expect(positions).toHaveLength(6)
    for (const imgPos of positions) {
      const html = card({ src: PIC, imgPos })
      expect(html).toContain(PIC)
      expect(html).toContain('Τίτλος')
      expect(html).toContain('ΣΩΜΑ-ΚΑΡΤΑΣ')
    }
  })

  it('χωρίς φωτογραφία η κάρτα δεν βγάζει σπασμένο πλαίσιο', () => {
    const html = card({ imgPos: 'left' })
    expect(html).not.toContain('<img')
    expect(html).toContain('Τίτλος')
  })

  it('το μέγεθος αλλάζει πραγματικά το πλάτος — πάνω/κάτω', () => {
    expect(card({ src: PIC, imgPos: 'top', imgSize: 'full' })).toContain('max-width:512px')
    expect(card({ src: PIC, imgPos: 'top', imgSize: 'large' })).toContain('max-width:420px')
    expect(card({ src: PIC, imgPos: 'top', imgSize: 'medium' })).toContain('max-width:320px')
    expect(card({ src: PIC, imgPos: 'top', imgSize: 'small' })).toContain('max-width:200px')
  })

  it('το μέγεθος αλλάζει το πλάτος της στήλης — αριστερά/δεξιά', () => {
    expect(card({ src: PIC, imgPos: 'left', imgSize: 'large' })).toContain('max-width:220px')
    expect(card({ src: PIC, imgPos: 'right', imgSize: 'medium' })).toContain('max-width:170px')
    expect(card({ src: PIC, imgPos: 'left', imgSize: 'small' })).toContain('max-width:120px')
  })

  it('αριστερά και δεξιά δίνουν ΑΝΤΙΣΤΡΟΦΗ σειρά κελιών', () => {
    const left = card({ src: PIC, imgPos: 'left' })
    const right = card({ src: PIC, imgPos: 'right' })
    expect(left.indexOf(PIC)).toBeLessThan(left.indexOf('ΣΩΜΑ-ΚΑΡΤΑΣ'))
    expect(right.indexOf(PIC)).toBeGreaterThan(right.indexOf('ΣΩΜΑ-ΚΑΡΤΑΣ'))
  })

  it('κάτω βάζει την εικόνα ΜΕΤΑ το κείμενο', () => {
    const html = card({ src: PIC, imgPos: 'bottom' })
    expect(html.indexOf(PIC)).toBeGreaterThan(html.indexOf('ΣΩΜΑ-ΚΑΡΤΑΣ'))
  })

  it('η στοίχιση ισχύει μόνο όταν η εικόνα δεν γεμίζει την κάρτα', () => {
    expect(card({ src: PIC, imgPos: 'top', imgSize: 'medium', imgAlign: 'right' })).toContain('align="right"')
    // Σε πλήρες πλάτος δεν υπάρχει τίποτα να στοιχίσεις — δεν μπαίνει πίνακας
    expect(card({ src: PIC, imgPos: 'top', imgSize: 'full', imgAlign: 'right' })).not.toContain('align="right"')
  })

  it('παλιά κάρτα χωρίς τα νέα πεδία μένει όπως ήταν: εικόνα πάνω, πλήρες πλάτος', () => {
    const html = card({ src: PIC })
    expect(html).toContain('max-width:512px')
    expect(html.indexOf(PIC)).toBeLessThan(html.indexOf('ΣΩΜΑ-ΚΑΡΤΑΣ'))
  })
})
