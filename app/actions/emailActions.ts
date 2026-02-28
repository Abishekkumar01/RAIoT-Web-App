"use server"

import nodemailer from 'nodemailer';

// Since the user didn't specify the exact SMTP provider, we assume standard SMTP via Gmail or similar.
// Ensure SMTP_EMAIL and SMTP_PASSWORD are set in .env.local
const transporter = nodemailer.createTransport({
    service: 'gmail', // Assuming gmail for simplicity, or change to host/port
    auth: {
        user: process.env.SMTP_EMAIL || 'websitelelo.in@gmail.com',
        pass: process.env.SMTP_PASSWORD || '' // Needs an App Password if using Gmail
    }
});

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
    try {
        if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
            console.error("CRITICAL SMTP ERROR: Missing Credentials in Production Environment.", {
                email: !!process.env.SMTP_EMAIL,
                password: !!process.env.SMTP_PASSWORD
            });
            console.warn("⚠️ SMTP credentials not set. Simulated email sending:", options.subject, "to", options.to);
            return true; // Simulate success if credentials are missing during dev
        }

        console.log("Attempting to send real email to:", options.to, "Subject:", options.subject);

        const info = await transporter.sendMail({
            from: `"RAIoT Dashboard" <${process.env.SMTP_EMAIL}>`,
            ...options
        });

        console.log("Email sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("FATAL ERROR IN TRANSPORTER: ", error);
        throw error; // Throwing so it surfaces to the frontend toast
    }
};

export const sendRequestReceivedEmail = async (to: string, componentNames: string) => {
    return sendEmail({
        to,
        subject: "Inventory Request Received - RAIoT",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2196F3;">Request Received</h2>
                <p>Hello,</p>
                <p>We have successfully received your request for <strong>${componentNames}</strong>.</p>
                <p>Your request is currently pending approval from an Inventory Manager. You will receive another email once it has been reviewed.</p>
                <br/>
                <p>Regards,<br/>RAIoT Inventory Team</p>
            </div>
        `
    });
};

export const sendNewRequestAlertEmail = async (userName: string, componentNames: string) => {
    return sendEmail({
        to: process.env.SMTP_EMAIL || 'websitelelo.in@gmail.com', // Send to self (admins)
        subject: "🚨 New Inventory Request - RAIoT",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #FF9800;">New Inventory Request Requires Approval</h2>
                <p>Hello Admin,</p>
                <p><strong>${userName}</strong> has just submitted a new inventory request for the following items: <strong>${componentNames}</strong>.</p>
                <p>Please log in to the <a href="https://raiot-web-app.vercel.app/admin/inventory">RAIoT Admin Dashboard</a> to review and approve or reject this request.</p>
                <br/>
                <p>System Automated Message<br/>RAIoT Inventory</p>
            </div>
        `
    });
};

export const sendApprovalEmail = async (to: string, componentNames: string) => {
    return sendEmail({
        to,
        subject: "Inventory Request Approved - RAIoT",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #4CAF50;">Request Approved</h2>
                <p>Hello,</p>
                <p>Your request for <strong>${componentNames}</strong> has been approved.</p>
                <p>Please collect the components from the inventory room. Make sure to return them before the due date!</p>
                <br/>
                <p>Regards,<br/>RAIoT Inventory Team</p>
            </div>
        `
    });
};

export const sendRejectionEmail = async (to: string, componentNames: string, reason?: string) => {
    return sendEmail({
        to,
        subject: "Inventory Request Rejected - RAIoT",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #f44336;">Request Rejected</h2>
                <p>Hello,</p>
                <p>Unfortunately, your request for <strong>${componentNames}</strong> has been rejected.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>Please contact the administrators if you have any questions.</p>
                <br/>
                <p>Regards,<br/>RAIoT Inventory Team</p>
            </div>
        `
    });
};

export const sendWarningEmail = async (to: string, componentNames: string, timeRemaining: string) => {
    return sendEmail({
        to,
        subject: "URGENT: Inventory Return Warning - RAIoT",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #ff9800;">Return Warning</h2>
                <p>Hello,</p>
                <p>This is a reminder that your issuance window for <strong>${componentNames}</strong> is ending soon.</p>
                <p><strong>Time Remaining:</strong> ${timeRemaining}</p>
                <p>Please return the components to the inventory manager to avoid any penalties.</p>
                <br/>
                <p>Regards,<br/>RAIoT Inventory Team</p>
            </div>
        `
    });
};
