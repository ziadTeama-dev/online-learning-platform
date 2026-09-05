import axios from "axios";
import crypto from "crypto";

export const createFawryReferencePayment = async ({
  merchantRefNum,
  customerProfileId,
  customerName,
  customerMobile,
  customerEmail,
  amount,
  courseId,
  courseName,
}) => {
  const merchantCode = process.env.FAWRY_MERCHANT_CODE;
  const secureKey = process.env.FAWRY_SECURE_KEY;

  const paymentMethod = "PayAtFawry";
  const formattedAmount = Number(amount).toFixed(2);

  // Signature
  const signatureString =
    merchantCode +
    merchantRefNum +
    customerProfileId +
    paymentMethod +
    formattedAmount +
    secureKey;

  const signature = crypto
    .createHash("sha256")
    .update(signatureString)
    .digest("hex");

  const data = {
    merchantCode,
    merchantRefNum,
    customerProfileId,

    customerName,
    customerMobile,
    customerEmail,

    paymentMethod,
    amount: formattedAmount,
    currencyCode: "EGP",

    description: courseName,

    language: "ar-eg",

    chargeItems: [
      {
        itemId: courseId.toString(),
        description: courseName,
        price: formattedAmount,
        quantity: 1,
      },
    ],

    orderWebHookUrl: process.env.FAWRY_WEBHOOK_URL,

    signature,
  };

  const response = await axios.post(
    process.env.FAWRY_PAYMENT_URL,
    data,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  return response.data;
};