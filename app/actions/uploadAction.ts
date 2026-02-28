"use server"

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function getCloudinarySignature() {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // You can add more parameters like folder, tags here if needed
    const paramsToSign = {
        timestamp: timestamp,
        folder: 'raiot_inventory'
    };

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET!
    );

    return { timestamp, signature };
}
