import { supabaseAdmin } from "../lib/supabase";
import crypto from "crypto";
import path from "path";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Uploads an attendance photo to the Supabase Storage bucket.
 * 
 * @param fileBuffer The buffer of the image to upload
 * @param mimeType The MIME type of the image
 * @param companyId The ID of the company
 * @param profileId The ID of the profile (user)
 * @returns The public URL of the uploaded photo
 */
export async function uploadAttendancePhoto(
  fileBuffer: Buffer,
  mimeType: string,
  companyId: string,
  profileId: string
): Promise<string> {
  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  // 2. Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 2MB limit.");
  }

  // 3. Generate a secure, collision-resistant filename
  // Format: attendance/{companyId}/{profileId}/{uuid}.extension
  const extension = mimeType === "image/jpeg" ? ".jpg" : mimeType === "image/png" ? ".png" : ".webp";
  const uniqueId = crypto.randomUUID();
  const filePath = `attendances/${companyId}/${profileId}/${uniqueId}${extension}`;

  // 4. Upload to Supabase Storage (Using the 'attachments' bucket)
  // Note: The 'attachments' bucket must be created manually in Supabase.
  const { data, error } = await supabaseAdmin.storage
    .from("attachments")
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  // 5. Get Public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from("attachments")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Uploads an avatar photo to the Supabase Storage attachments bucket.
 * 
 * @param fileBuffer The buffer of the image to upload
 * @param mimeType The MIME type of the image
 * @param profileId The ID of the profile (user)
 * @returns The public URL of the uploaded photo
 */
export async function uploadAvatarPhoto(
  fileBuffer: Buffer,
  mimeType: string,
  profileId: string
): Promise<string> {
  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  // 2. Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 2MB limit.");
  }

  // 3. Generate a secure, collision-resistant filename
  const extension = mimeType === "image/jpeg" ? ".jpg" : mimeType === "image/png" ? ".png" : ".webp";
  const uniqueId = crypto.randomUUID();
  const filePath = `avatars/${profileId}/${uniqueId}${extension}`;

  // 4. Upload to Supabase Storage (Using the 'attachments' bucket)
  const { data, error } = await supabaseAdmin.storage
    .from("attachments")
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload avatar: ${error.message}`);
  }

  // 5. Get Public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from("attachments")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Uploads a company avatar photo to the Supabase Storage attachments bucket.
 * 
 * @param fileBuffer The buffer of the image to upload
 * @param mimeType The MIME type of the image
 * @param companyId The ID of the company
 * @returns The public URL of the uploaded photo
 */
export async function uploadCompanyPhoto(
  fileBuffer: Buffer,
  mimeType: string,
  companyId: string
): Promise<string> {
  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  // 2. Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 2MB limit.");
  }

  // 3. Generate a secure, collision-resistant filename
  const extension = mimeType === "image/jpeg" ? ".jpg" : mimeType === "image/png" ? ".png" : ".webp";
  const uniqueId = crypto.randomUUID();
  const filePath = `companies/${companyId}/${uniqueId}${extension}`;

  // 4. Upload to Supabase Storage (Using the 'attachments' bucket)
  const { data, error } = await supabaseAdmin.storage
    .from("attachments")
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload company photo: ${error.message}`);
  }

  // 5. Get Public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from("attachments")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
