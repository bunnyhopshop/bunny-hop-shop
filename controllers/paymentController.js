import crypto from "crypto";

// helper to build timestamp in required format
function getTimestamp() {
  // Format: YYYYMMDDHHMMSS (approx)
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}${hh}${mm}${ss}`;
}

export const initiatePayment = async (req, res) => {
  try {
    const merchantID = process.env.JAZZCASH_MERCHANT_ID || "";
    const password = process.env.JAZZCASH_PASSWORD || "";
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT || "";
    const returnUrl = process.env.JAZZCASH_RETURN_URL || "http://localhost:3000/payment-success";

    const amount = req.body.amount; // expected in PKR (e.g., 1500) from frontend
    if (!amount) return res.status(400).json({ message: "amount required" });

    // JazzCash expects amount in paisa-like format (multiply by 100)
    const pp_Amount = String(Math.round(Number(amount) * 100));

    const timestamp = getTimestamp();
    const txnRef = "T" + timestamp;
    const billRef = "B" + timestamp;

    const data = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: merchantID,
      pp_Password: password,
      pp_TxnRefNo: txnRef,
      pp_Amount: pp_Amount,
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: timestamp,
      pp_BillReference: billRef,
      pp_Description: "Order Payment",
      pp_ReturnURL: returnUrl
    };

    // Build string to hash according to JazzCash rules: integritySalt & concatenated values
    const values = [
      data.pp_Version,
      data.pp_TxnType,
      data.pp_Language,
      data.pp_MerchantID,
      data.pp_Password,
      data.pp_TxnRefNo,
      data.pp_Amount,
      data.pp_TxnCurrency,
      data.pp_TxnDateTime,
      data.pp_BillReference,
      data.pp_Description,
      data.pp_ReturnURL
    ];

    const sortedString = integritySalt + "&" + values.join("&");
    const hash = crypto.createHmac("sha256", integritySalt).update(sortedString).digest("hex");

    data.pp_SecureHash = hash;

    // Return payload which frontend will post to JazzCash sandbox endpoint
    return res.json({
      paymentURL: "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform",
      data
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "failed to initiate payment" });
  }
};
