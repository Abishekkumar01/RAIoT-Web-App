"use server"

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: 'dvjvbonjb',
    api_key: '789299399652629',
    api_secret: '2_90TlHyRGKq6MTj-yBkReyBm_Q',
});

export async function getCloudinarySignature(folderName: string = 'raiot_inventory') {
    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign = {
        timestamp: timestamp,
        folder: folderName
    };

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        '2_90TlHyRGKq6MTj-yBkReyBm_Q' // Base inventory secret
    );

    return { timestamp, signature };
}

export async function getRMSCloudinarySignature(folderName: string = 'raiot_rms') {
    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign = {
        timestamp: timestamp,
        folder: folderName
    };

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        'ax-pjJXuVZYhUjK7u4p9Yt9mP60' // New RMS secret
    );

    return { timestamp, signature };
}
