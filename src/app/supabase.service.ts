import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';
import { compressPdf } from './pdf-compress';

const SUPABASE_URL = 'https://kopnpzpanfptdboaelvf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_j-wI6ei8PyX2H7RguVOl9g_hrnyLSMH';
const BUCKET = 'gos-documents';
const META_TABLE = 'gos_documents';
const MAX_SIZE = 500 * 1024; // 500KB

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

export const GO_CATEGORIES = [
  'General administration',
  'Survey and Land records',
  'Revenue Lands',
] as const;
export type GoCategory = typeof GO_CATEGORIES[number];

export interface DocMeta {
  fileName: string;
  subject: string;
  goDate: string; // yyyy-mm-dd
  category: GoCategory;
}

export interface StoredDoc {
  id: string;
  name: string; // storage object name
  created_at: string;
  size: number;
  originalSize?: number;
  type: string;
  url: string;
  meta?: DocMeta; // absent for files uploaded before metadata was introduced
}

interface MetaRow {
  storage_path: string;
  file_name: string;
  subject: string;
  go_date: string;
  category: GoCategory;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUp(email: string, password: string): Promise<boolean> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
    return !data.session;
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async listFiles(): Promise<StoredDoc[]> {
    const [{ data, error }, { data: rows, error: metaError }] = await Promise.all([
      this.supabase.storage
        .from(BUCKET)
        .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }),
      this.supabase
        .from(META_TABLE)
        .select('storage_path, file_name, subject, go_date, category'),
    ]);

    if (error) throw error;
    if (metaError) throw metaError;
    if (!data) return [];

    const metaByPath = new Map((rows as MetaRow[] ?? []).map(r => [r.storage_path, this.toMeta(r)]));

    return data
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => ({
        id: f.id ?? f.name,
        name: f.name,
        created_at: f.created_at ?? new Date().toISOString(),
        size: (f.metadata as any)?.size ?? 0,
        type: this.fileType(f.name),
        url: this.getPublicUrl(f.name),
        meta: metaByPath.get(f.name),
      }));
  }

  async uploadFile(file: File, meta: DocMeta): Promise<StoredDoc> {
    const originalSize = file.size;
    const compressed = await this.compressFile(file);

    const timestamp = Date.now();
    const safeName = `${timestamp}_${compressed.name}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(safeName, compressed, { upsert: false });

    if (error) throw error;

    const { error: metaError } = await this.supabase.from(META_TABLE).insert({
      storage_path: safeName,
      file_name: meta.fileName,
      subject: meta.subject,
      go_date: meta.goDate,
      category: meta.category,
    });
    if (metaError) {
      // Don't leave an orphaned file without its details
      await this.supabase.storage.from(BUCKET).remove([safeName]);
      throw metaError;
    }

    return {
      id: safeName,
      name: safeName,
      created_at: new Date().toISOString(),
      size: compressed.size,
      originalSize,
      type: this.fileType(compressed.name),
      url: this.getPublicUrl(safeName),
      meta,
    };
  }

  private toMeta(r: MetaRow): DocMeta {
    return { fileName: r.file_name, subject: r.subject, goDate: r.go_date, category: r.category };
  }

  private async compressFile(file: File): Promise<File> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (IMAGE_EXTS.includes(ext)) {
      return await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
      });
    }

    if (ext === 'pdf' && file.size > MAX_SIZE) {
      return await compressPdf(file);
    }

    return file;
  }

  async deleteFile(storageName: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .remove([storageName]);
    if (error) throw error;

    const { error: metaError } = await this.supabase
      .from(META_TABLE)
      .delete()
      .eq('storage_path', storageName);
    if (metaError) throw metaError;
  }

  getPublicUrl(name: string): string {
    const { data } = this.supabase.storage
      .from(BUCKET)
      .getPublicUrl(name);
    return data.publicUrl;
  }

  private fileType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'DOC';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'XLS';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'IMG';
    return 'FILE';
  }
}
