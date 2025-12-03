function orderEmailTemplate(order) {
    let itemsHTML = order.items.map(i => `
        <tr>
            <td style="padding:8px; border:1px solid #ddd;">${i.productId.title}</td>
            <td style="padding:8px; border:1px solid #ddd;">${i.quantity}</td>
        </tr>
    `).join("");

    return `
    <div style="font-family:Arial; max-width:600px; margin:auto; padding:20px; border:1px solid #eee;">
        <h2 style="color:#333;">Bunny Hop Shop – Order Confirmation</h2>
        <p>Hi ${order.fullName},</p>
        <p>Your order has been confirmed! Here’s the summary:</p>

        <h3>Order Details</h3>
        <table style="width:100%; border-collapse:collapse;">
            <tr>
                <th style="padding:10px; border:1px solid #ddd; background:#f5f5f5;">Product Name</th>
                <th style="padding:10px; border:1px solid #ddd; background:#f5f5f5;">Qty</th>
            </tr>
            ${itemsHTML}
        </table>

        <p style="margin-top:20px;"><strong>Total Price:</strong> PKR.${order.totalPrice}</p>
        <p><strong>Order ID:</strong> ${order._id}</p>

        <br>
        <p>Thank you for shopping with us!</p>
        <h3 style="color:#555;">Bunny Hop Shop</h3>
    </div>
    `;
}

module.exports = {orderEmailTemplate}