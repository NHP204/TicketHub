import { createClient } from '@supabase/supabase-js';

// Upload lên một bucket public của Supabase Storage, trả về public url của file.
export class SupabaseStorage {
  constructor({ url, serviceKey, bucket }) {
    if (!url || !serviceKey || !bucket) {
      throw new Error('SUPABASE_URL, SUPABASE_SERVICE_KEY và SUPABASE_BUCKET là bắt buộc');
    }
    // Service key chạy phía server: không lưu hay làm mới phiên đăng nhập.
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.bucket = bucket;
  }

  async upload({ key, buffer, contentType }) {
    const bucket = this.client.storage.from(this.bucket);
    const { error } = await bucket.upload(key, buffer, { contentType, upsert: false });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data } = bucket.getPublicUrl(key);
    return { url: data.publicUrl };
  }
}
