"use server"

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dp5daaegm').trim(),
    api_key: (process.env.CLOUDINARY_API_KEY || '459138652653136').trim(),
    api_secret: (process.env.CLOUDINARY_API_SECRET || 'icVGPJKlpO14YRDY4dK9A5xk3LA').trim(),
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
        (process.env.CLOUDINARY_API_SECRET || 'icVGPJKlpO14YRDY4dK9A5xk3LA').trim()
    );

    return { timestamp, signature };
}
