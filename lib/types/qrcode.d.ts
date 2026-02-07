declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    type?: 'image/png' | 'image/svg+xml' | 'image/jpeg' | 'svg' | 'png'
    quality?: number
    margin?: number
    width?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  export interface QRCode {
    toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
    toString(text: string, options?: QRCodeToDataURLOptions): Promise<string>
  }

  const QRCode: QRCode
  export default QRCode
}
