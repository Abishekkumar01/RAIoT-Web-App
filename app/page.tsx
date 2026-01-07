import fs from "fs";
import path from "path";
import PageClient from "./PageClient";

export default function Page() {
  const galleryDir = path.join(process.cwd(), "public/Marquee gallary");
  let images: string[] = [];

  try {
    if (fs.existsSync(galleryDir)) {
      const files = fs.readdirSync(galleryDir);
      images = files
        .filter((file) => /\.(jpg|jpeg|png|webp|gif)$/i.test(file))
        .map((file) => `/Marquee gallary/${file}`);
    } else {
      console.warn("Marquee gallery directory not found:", galleryDir);
    }
  } catch (error) {
    console.error("Error reading gallery directory:", error);
  }

  return <PageClient galleryImages={images} />;
}
