import { NextResponse } from "next/server";
import crypto from "crypto";

const NALO_CREDENTIALS = {
  username: process.env.NALO_USERNAME!,
  merchant_id: process.env.NALO_MERCHANT_ID!,
  password: process.env.NALO_PASSWORD!,
};

function buildNaloPayload({
  order_id,
  customerName,
  amount,
  item_desc,
  customerNumber,
  payby,
}: {
  order_id: string;
  customerName: string;
  amount: number;
  item_desc: string;
  customerNumber: string;
  payby: string;
}) {
  const key = Math.floor(1000 + Math.random() * 9000).toString();

  const passwordMd5 = crypto
    .createHash("md5")
    .update(NALO_CREDENTIALS.password)
    .digest("hex");

  const secrete = crypto
    .createHash("md5")
    .update(`${NALO_CREDENTIALS.username}${key}${passwordMd5}`)
    .digest("hex");

  const normalizedNumber = customerNumber.startsWith("233")
    ? customerNumber
    : customerNumber.replace(/^0/, "233");

  return {
    merchant_id: NALO_CREDENTIALS.merchant_id,
    secrete,
    key,
    order_id,
    customerName,
    amount: Number(amount).toFixed(2), // ✅ "2.00"
    item_desc,
    customerNumber: normalizedNumber,
    payby,
    callback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/nalo-callback`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = buildNaloPayload(body);

    console.log("Sending to NALO:", payload);

    const naloRes = await fetch("https://api.nalosolutions.com/payplus/api/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await naloRes.text();
    console.log("NALO response:", text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
