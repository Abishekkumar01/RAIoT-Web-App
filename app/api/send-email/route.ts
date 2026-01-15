import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Use port 587 with secure:false for better compatibility
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER, // e.g., 'amanchoudhary.1502@gmail.com'
        pass: process.env.EMAIL_PASS  // App Password
    }
});

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { type } = payload;

        if (type === 'new_request') {
            // Notify Admin
            const { userName, items } = payload;
            const adminEmail = 'amanchoudhary.1502@gmail.com';

            const itemsHtml = items.map((item: any) => `
                <li style="margin-bottom: 10px;">
                    <strong>${item.componentName}</strong><br>
                    Qty: ${item.quantity} | Duration: ${item.days || 7} days
                </li>
            `).join('');

            await transporter.sendMail({
                from: `"RAIoT Tech Club" <${process.env.EMAIL_USER}>`,
                to: adminEmail,
                subject: `New Request: ${userName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #2196F3;">New Component Request</h2>
                        <p>User <strong>${userName}</strong> has requested:</p>
                        <ul>${itemsHtml}</ul>
                        <p style="margin-top: 20px; font-size: 12px; color: #666;">Log in to the dashboard to take action.</p>
                    </div>
                `
            });
            return NextResponse.json({ success: true });
        }

        if (type === 'status_update') {
            // Notify Member
            const { status, userName, userEmail, componentName, quantity } = payload;

            const color = status === 'approved' ? '#4CAF50' : status === 'rejected' ? '#F44336' : '#2196F3';
            const title = status === 'approved' ? 'Request Approved' : status === 'rejected' ? 'Request Declined' : 'Item Returned';

            await transporter.sendMail({
                from: `"RAIoT Tech Club" <${process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: `Update: ${title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid ${color}; border-radius: 8px;">
                        <h2 style="color: ${color};">${title}</h2>
                        <p>Hello <strong>${userName}</strong>,</p>
                        <p>Your request for the following component has been <strong>${status.toUpperCase()}</strong>:</p>
                        <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">
                            <strong>${componentName}</strong><br>
                            Quantity: ${quantity}
                        </div>
                        ${status === 'approved' ? '<p>Please collect your component from the lab.</p>' : ''}
                        ${status === 'rejected' ? '<p>Contact the admin if you have questions.</p>' : ''}
                        <p>Best regards,<br/>RAIoT Inventory System</p>
                    </div>
                `
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });

    } catch (error: any) {
        console.error('Email error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
