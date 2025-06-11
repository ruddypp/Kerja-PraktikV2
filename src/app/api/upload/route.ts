import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Gunakan PNG, JPEG, atau GIF" },
        { status: 400 }
      );
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar (max 5MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Use more predictable filename with appropriate extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    // Make sure uploads directory exists
    const uploadsDir = join(process.cwd(), "public/uploads");
    
    // Create the directory if it doesn't exist
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // Write file to disk
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);
    
    // Log success for debugging
    console.log(`File successfully saved to ${filePath}`);
    
    // Return URL with absolute path to ensure it's always accessible
    const url = `/uploads/${fileName}`;
    
    // Extract host from request to return full URL if needed
    const requestUrl = new URL(req.url);
    const host = `${requestUrl.protocol}//${requestUrl.host}`;
    const fullUrl = `${host}${url}`;
    
    console.log(`Image URL: ${url}`);
    console.log(`Full image URL: ${fullUrl}`);
    
    return NextResponse.json({ 
      url,
      fullUrl,
      success: true
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat upload file", details: error.message },
      { status: 500 }
    );
  }
} 