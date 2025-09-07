import { NextResponse } from 'next/server';
import { crc16ccitt } from 'crc';

// Helper function to format TLV (Tag-Length-Value)
function formatTlv(tag: string, value: string): string {
    const length = value.length.toString().padStart(2, '0');
    return `${tag}${length}${value}`;
}

export async function POST(request: Request) {
  try {
    const { amount, referenceId } = await request.json();

    if (!amount || !referenceId) {      
        return NextResponse.json({ error: 'Missing amount or referenceId' }, { status: 400 });
    }

    // --- Construct Gh-QR Payload ---
    const payloadFormatIndicator = formatTlv('00', '01'); // Mandatory
    const pointOfInitiationMethod = formatTlv('01', '12'); // 11 for static, 12 for dynamic
    const merchantCategoryCode = formatTlv('52', '8249'); // 8249 for "Schools and Educational Services"
    const transactionCurrency = formatTlv('53', '936'); // 936 for GHS
    const transactionAmount = formatTlv('54', String(amount));
    const countryCode = formatTlv('58', 'GH');
    const merchantName = formatTlv('59', 'CampusFlow'); // Should be fetched from settings ideally

    // Additional Data Field containing the reference ID
    const additionalData = formatTlv('01', referenceId); 
    const additionalDataFieldTemplate = formatTlv('62', additionalData);

    const payloadWithoutCrc = [
        payloadFormatIndicator,
        pointOfInitiationMethod,
        merchantCategoryCode,
        transactionCurrency,
        transactionAmount,
        countryCode,
        merchantName,
        additionalDataFieldTemplate
    ].join('');
    
    // Calculate CRC
    const crcValue = crc16ccitt(Buffer.from(payloadWithoutCrc, 'utf-8')).toString(16).toUpperCase().padStart(4, '0');
    
    const crc = `6304${crcValue}`;

    const finalPayload = `${payloadWithoutCrc}${crc}`;

    return NextResponse.json({ qrPayload: finalPayload }, { status: 200 });

  } catch (error) {
    console.error('Error generating Gh-QR payload:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
