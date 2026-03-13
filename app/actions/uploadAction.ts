"use server"

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: 'dvjvbonjb',
    api_key: '789299399652629',
    api_secret: '2_90TlHyRGKq6MTj-yBkReyBm_Q',
});

export async function getCloudinarySignature(folderName: string = 'raiot_inventory') {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // You can add more parameters like folder, tags here if needed
    const paramsToSign = {
        timestamp: timestamp,
        folder: folderName
    };

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        '2_90TlHyRGKq6MTj-yBkReyBm_Q'
    );

    return { timestamp, signature };
}
