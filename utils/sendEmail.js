const nodemailer = require("nodemailer");

module.exports = async function sendEmail({ to, subject, html }) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: `"Bunny Hop Shop" <${process.env.EMAIL}>`,
        to,
        subject,
        html
    });
};
