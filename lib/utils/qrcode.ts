/**
 * QR Code Generation for Memorial URLs
 * Generates downloadable QR codes pointing to memorial pages
 */

/**
 * Generates a QR code as PNG and triggers download
 * @param memorialUrl - The memorial URL to encode in QR code
 * @param memorialName - The deceased's name for the filename
 * @returns Promise that resolves when download is triggered
 */
export async function downloadQRCode(memorialUrl: string, memorialName: string): Promise<void> {
  try {
    // Use qr-code.js library (lightweight, no dependencies)
    // First, we need to import the QR code library
    const QRCode = (await import('qrcode')).default

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(memorialUrl, {
      errorCorrectionLevel: 'H', // High error correction
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300, // 300x300px for good print quality
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    // Create a temporary link element
    const link = document.createElement('a')
    link.href = qrCodeDataUrl
    link.download = `${sanitizeFilename(memorialName)}-qr-code.png`

    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code. Please try again.')
  }
}

/**
 * Generates a QR code as SVG (for better print quality)
 * @param memorialUrl - The memorial URL to encode in QR code
 * @param memorialName - The deceased's name for the filename
 * @returns Promise that resolves when download is triggered
 */
export async function downloadQRCodeSVG(memorialUrl: string, memorialName: string): Promise<void> {
  try {
    const QRCode = (await import('qrcode')).default

    // Generate QR code as SVG
    const qrCodeSvg = await QRCode.toString(memorialUrl, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      quality: 0.95,
      margin: 1,
      width: 300,
    })

    // Create blob and download
    const blob = new Blob([qrCodeSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sanitizeFilename(memorialName)}-qr-code.svg`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating QR code SVG:', error)
    throw new Error('Failed to generate QR code. Please try again.')
  }
}

/**
 * Gets QR code as data URL (for display in UI)
 * @param memorialUrl - The memorial URL to encode
 * @returns Promise that resolves to data URL
 */
export async function getQRCodeDataUrl(memorialUrl: string): Promise<string> {
  try {
    const QRCode = (await import('qrcode')).default

    const dataUrl = await QRCode.toDataURL(memorialUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    return dataUrl
  } catch (error) {
    console.error('Error generating QR code data URL:', error)
    throw new Error('Failed to generate QR code.')
  }
}

/**
 * Sanitizes filename to remove unsafe characters
 * @param name - The filename to sanitize
 * @returns Safe filename
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .slice(0, 50) // Limit length
}

/**
 * Copies QR code download link to clipboard
 * @param memorialUrl - The memorial URL
 * @returns Promise that resolves when copied
 */
export async function copyQRCodeLinkToClipboard(memorialUrl: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(memorialUrl)
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    throw new Error('Failed to copy link. Please try again.')
  }
}
