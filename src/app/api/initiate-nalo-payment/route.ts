/* 1. 4-digit key (doc: STRING(4)) -------------------- */
const key = Math.floor(1000 + Math.random() * 9000).toString(); // → "0626" style

/* 2. secrete (doc: md5(username . key . md5(password))) */
const passwordMd5 = crypto.createHash('md5').update("RveMxX9MN8JVM6d").digest('hex');
const secrete = crypto
  .createHash('md5')
  .update(`${MOCK_NALO_CREDENTIALS.username}${key}${passwordMd5}`)
  .digest('hex'); // → 32-char lower-case hex

/* 3. exact doc shape (same order, same types) --------- */
const payload: Record<string, string> = {
  merchant_id: MOCK_NALO_CREDENTIALS.merchant_id, // "NPS_000363"
  secrete,
  key,
  order_id,
  customerName,
  amount: Number(amount).toFixed(2), // "2.00"
  item_desc,
  customerNumber: customerNumber.replace(/^0/, '233'), // 12 digits
  payby,
  callback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/nalo-callback`.trim(),
};

/* 4. stringify → matches sample byte-for-byte --------- */
const body = JSON.stringify(payload); // only 9 keys, no extras
console.log('Exact Nalo body:', body);