import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// POST /api/generate-pdf
//   body: { type: 'invoice' | 'proposal' | 'contract', data: {...} }
// Returns: application/pdf binary stream
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  const { type, data } = req.body || {}

  try {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const { width, height } = page.getSize()

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const BLACK = rgb(0, 0, 0)
    const GRAY = rgb(0.4, 0.4, 0.4)
    const LIGHT_GRAY = rgb(0.95, 0.95, 0.95)
    const WHITE = rgb(1, 1, 1)

    const drawText = (text, x, y, opts = {}) => {
      page.drawText(String(text || ''), {
        x,
        y,
        size: opts.size || 11,
        font: opts.bold ? fontBold : fontRegular,
        color: opts.color || BLACK,
        maxWidth: opts.maxWidth,
      })
    }
    const drawRect = (x, y, w, h, color) => {
      page.drawRectangle({ x, y, width: w, height: h, color })
    }
    const drawLine = (x1, y1, x2, y2, color = GRAY) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.5,
        color,
      })
    }

    if (type === 'invoice') {
      const {
        client_name,
        client_email,
        client_company,
        invoice_number,
        invoice_date,
        due_date,
        line_items = [],
        total_usd,
        total_awg,
      } = data || {}

      drawRect(0, height - 80, width, 80, BLACK)
      drawText('LITHOS LABS', 40, height - 35, { size: 22, bold: true, color: WHITE })
      drawText('lithoslabs.agency', 40, height - 55, { size: 10, color: rgb(0.7, 0.7, 0.7) })
      drawText('INVOICE', width - 140, height - 35, { size: 22, bold: true, color: WHITE })
      drawText(`#${invoice_number || 'INV-001'}`, width - 140, height - 55, {
        size: 10,
        color: rgb(0.7, 0.7, 0.7),
      })

      drawText('BILL TO', 40, height - 110, { size: 9, bold: true, color: GRAY })
      drawText(client_name || '', 40, height - 128, { size: 12, bold: true })
      drawText(client_company || '', 40, height - 145, { size: 10, color: GRAY })
      drawText(client_email || '', 40, height - 160, { size: 10, color: GRAY })

      drawText('INVOICE DATE', width - 200, height - 110, { size: 9, bold: true, color: GRAY })
      drawText(invoice_date || '', width - 200, height - 128, { size: 11 })
      drawText('DUE DATE', width - 200, height - 150, { size: 9, bold: true, color: GRAY })
      drawText(due_date || '', width - 200, height - 168, { size: 11 })

      const tableTop = height - 220
      drawRect(40, tableTop, width - 80, 28, BLACK)
      drawText('SERVICE', 50, tableTop + 9, { size: 9, bold: true, color: WHITE })
      drawText('DESCRIPTION', 180, tableTop + 9, { size: 9, bold: true, color: WHITE })
      drawText('USD', width - 180, tableTop + 9, { size: 9, bold: true, color: WHITE })
      drawText('AWG', width - 90, tableTop + 9, { size: 9, bold: true, color: WHITE })

      let y = tableTop - 20
      line_items.forEach((item, i) => {
        if (i % 2 === 0) drawRect(40, y - 8, width - 80, 24, LIGHT_GRAY)
        drawText(item.name || '', 50, y, { size: 10 })
        drawText(item.description || '', 180, y, {
          size: 9,
          color: GRAY,
          maxWidth: 180,
        })
        drawText(`$${item.price_usd || 0}`, width - 180, y, { size: 10 })
        drawText(`Afl. ${item.price_awg || 0}`, width - 90, y, { size: 10 })
        y -= 30
      })

      drawLine(40, y - 10, width - 40, y - 10)
      drawRect(width - 200, y - 50, 160, 36, BLACK)
      drawText('TOTAL', width - 190, y - 28, { size: 10, bold: true, color: WHITE })
      drawText(`$${total_usd || 0} USD`, width - 190, y - 42, { size: 10, color: WHITE })
      drawText(`Afl. ${total_awg || 0} AWG`, width - 100, y - 42, { size: 10, color: WHITE })

      drawText('PAYMENT METHODS', 40, y - 80, { size: 9, bold: true, color: GRAY })
      drawText('Bank Transfer  ·  Cash  ·  Sentoo  ·  Debit/Credit Card', 40, y - 96, { size: 10 })

      drawRect(0, 0, width, 50, BLACK)
      drawText('Thank you for your business — Payment due within 7 days', 40, 20, {
        size: 9,
        color: rgb(0.7, 0.7, 0.7),
      })
      drawText('lithoslabs.agency', width - 140, 20, { size: 9, color: rgb(0.7, 0.7, 0.7) })
    }

    if (type === 'proposal') {
      const {
        client_name,
        client_company,
        proposal_date,
        valid_until,
        project_name,
        scope_items = [],
        total_usd,
        total_awg,
        timeline,
      } = data || {}

      drawRect(0, height - 120, width, 120, BLACK)
      drawText('LITHOS LABS', 40, height - 50, { size: 28, bold: true, color: WHITE })
      drawText('PROJECT PROPOSAL', 40, height - 78, { size: 14, color: rgb(0.7, 0.7, 0.7) })
      drawText('lithoslabs.agency', 40, height - 98, { size: 10, color: rgb(0.5, 0.5, 0.5) })

      drawText('PREPARED FOR', 40, height - 150, { size: 9, bold: true, color: GRAY })
      drawText(client_name || '', 40, height - 168, { size: 14, bold: true })
      drawText(client_company || '', 40, height - 186, { size: 11, color: GRAY })

      drawText(`Date: ${proposal_date || ''}`, width - 200, height - 168, { size: 10, color: GRAY })
      drawText(`Valid Until: ${valid_until || ''}`, width - 200, height - 184, {
        size: 10,
        color: GRAY,
      })

      drawLine(40, height - 210, width - 40, height - 210)
      drawText('PROJECT', 40, height - 235, { size: 9, bold: true, color: GRAY })
      drawText(project_name || '', 40, height - 253, { size: 16, bold: true })

      drawText('ABOUT LITHOS LABS', 40, height - 295, { size: 9, bold: true, color: GRAY })
      drawText('Lithos Labs is a premium digital agency specializing in web development,', 40, height - 313, { size: 10, color: GRAY })
      drawText('business automation, AI systems, and CRM solutions based in Aruba.', 40, height - 328, { size: 10, color: GRAY })

      drawText('SCOPE OF WORK', 40, height - 365, { size: 9, bold: true, color: GRAY })
      let y = height - 385
      scope_items.forEach((item) => {
        drawRect(40, y - 6, 4, 16, BLACK)
        drawText(item, 54, y, { size: 10 })
        y -= 24
      })

      drawText('INVESTMENT', 40, y - 20, { size: 9, bold: true, color: GRAY })
      drawRect(40, y - 60, width - 80, 36, BLACK)
      drawText(`$${total_usd || 0} USD`, 60, y - 38, { size: 16, bold: true, color: WHITE })
      drawText(`Afl. ${total_awg || 0} AWG`, 200, y - 38, { size: 14, color: rgb(0.7, 0.7, 0.7) })

      drawText('ESTIMATED TIMELINE', 40, y - 85, { size: 9, bold: true, color: GRAY })
      drawText(timeline || '', 40, y - 103, { size: 10 })

      drawText('NEXT STEPS', 40, y - 135, { size: 9, bold: true, color: GRAY })
      drawText('1. Review this proposal and confirm your decision', 40, y - 153, { size: 10 })
      drawText('2. Sign the service agreement', 40, y - 169, { size: 10 })
      drawText('3. Submit initial payment to begin the project', 40, y - 185, { size: 10 })
      drawText('4. Kick-off call to align on goals and timeline', 40, y - 201, { size: 10 })

      drawRect(0, 0, width, 50, BLACK)
      drawText(
        'lithoslabs.agency  ·  Professional Web Development & Automation',
        40,
        20,
        { size: 9, color: rgb(0.7, 0.7, 0.7) },
      )
    }

    if (type === 'contract') {
      const {
        contract_number,
        contract_date,
        client_name,
        client_company,
        client_email,
        project_name,
        scope_items = [],
        total_usd,
        payment_terms,
        start_date,
        delivery_date,
        revision_rounds,
      } = data || {}

      drawRect(0, height - 80, width, 80, BLACK)
      drawText('LITHOS LABS', 40, height - 35, { size: 20, bold: true, color: WHITE })
      drawText('SERVICE AGREEMENT', width - 220, height - 35, {
        size: 14,
        bold: true,
        color: WHITE,
      })
      drawText(
        `Contract #${contract_number || 'LTH-001'}  ·  ${contract_date || ''}`,
        width - 220,
        height - 55,
        { size: 9, color: rgb(0.7, 0.7, 0.7) },
      )

      drawText('THIS AGREEMENT IS BETWEEN:', 40, height - 110, {
        size: 9,
        bold: true,
        color: GRAY,
      })
      drawText('Lithos Labs Digital Agency ("Service Provider")', 40, height - 128, { size: 10, bold: true })
      drawText('lithoslabs.agency  ·  Aruba', 40, height - 143, { size: 9, color: GRAY })
      drawText('AND', 40, height - 163, { size: 9, bold: true, color: GRAY })
      drawText(`${client_name || ''}  ·  ${client_company || ''} ("Client")`, 40, height - 181, {
        size: 10,
        bold: true,
      })
      drawText(client_email || '', 40, height - 196, { size: 9, color: GRAY })

      drawLine(40, height - 215, width - 40, height - 215)

      drawText('PROJECT', 40, height - 235, { size: 9, bold: true, color: GRAY })
      drawText(project_name || '', 40, height - 252, { size: 12, bold: true })

      drawText('SCOPE OF WORK', 40, height - 282, { size: 9, bold: true, color: GRAY })
      let y = height - 300
      scope_items.forEach((item) => {
        drawText(`• ${item}`, 40, y, { size: 9 })
        y -= 16
      })

      y -= 20
      drawLine(40, y, width - 40, y)
      y -= 20

      const terms = [
        ['INVESTMENT', `$${total_usd || 0} USD`],
        ['PAYMENT TERMS', payment_terms || '50% upfront, 50% on delivery'],
        ['START DATE', start_date || ''],
        ['DELIVERY DATE', delivery_date || ''],
        ['REVISION ROUNDS', revision_rounds || '2 rounds included'],
        ['PAYMENT METHODS', 'Bank Transfer, Cash, Sentoo, Debit/Credit Card'],
      ]
      terms.forEach(([label, value]) => {
        drawText(label, 40, y, { size: 8, bold: true, color: GRAY })
        drawText(value, 200, y, { size: 9 })
        y -= 20
      })

      y -= 10
      drawLine(40, y, width - 40, y)
      y -= 20

      const policies = [
        'CANCELLATION POLICY: Projects cancelled after work has begun are subject to a cancellation fee of 50% of the total project value.',
        'REVISION POLICY: This agreement includes the specified number of revision rounds. Additional revisions are billed at $75/hour.',
        'INTELLECTUAL PROPERTY: Upon full payment, the client receives full ownership of all deliverables.',
        'CONFIDENTIALITY: Both parties agree to keep project details and pricing confidential.',
        'DELAYS: Lithos Labs is not responsible for delays caused by client failure to provide required materials or feedback.',
        'WARRANTY: Lithos Labs provides 30 days of bug fixes after delivery at no additional cost.',
      ]
      policies.forEach((policy) => {
        const label = policy.split(':')[0]
        const text = policy.split(':').slice(1).join(':').trim()
        drawText(label + ':', 40, y, { size: 8, bold: true })
        drawText(text, 40, y - 12, { size: 8, color: GRAY, maxWidth: width - 80 })
        y -= 36
      })

      y -= 10
      drawLine(40, y, width - 40, y)
      y -= 30
      drawText('SIGNATURES', 40, y, { size: 9, bold: true, color: GRAY })
      y -= 30
      drawLine(40, y, 240, y)
      drawLine(width - 240, y, width - 40, y)
      y -= 15
      drawText('Client Signature', 40, y, { size: 8, color: GRAY })
      drawText('Lithos Labs', width - 240, y, { size: 8, color: GRAY })
      y -= 20
      drawText('Date: ________________', 40, y, { size: 8, color: GRAY })
      drawText('Date: ________________', width - 240, y, { size: 8, color: GRAY })

      drawRect(0, 0, width, 40, BLACK)
      drawText(
        'Lithos Labs Digital Agency  ·  lithoslabs.agency  ·  Aruba',
        40,
        14,
        { size: 8, color: rgb(0.6, 0.6, 0.6) },
      )
    }

    const pdfBytes = await pdfDoc.save()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lithos-${type}-${Date.now()}.pdf`,
    )
    return res.send(Buffer.from(pdfBytes))
  } catch (e) {
    console.error('PDF generation error:', e)
    return res.status(500).json({ error: e.message })
  }
}
