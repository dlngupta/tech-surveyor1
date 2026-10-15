import { Component, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService, StoredDoc, DocMeta, GO_CATEGORIES, GoCategory } from './supabase.service';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

// yyyy-mm-dd -> dd-mm-yyyy without going through Date (avoids timezone shifts)
function formatGoDate(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}-${m}-${y}`;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-gos',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header>
        <button class="back" (click)="goBack()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <h1>GOs &amp; Circulars</h1>
        <div class="header-actions">
          <button class="hdr-btn" title="Refresh" (click)="loadFiles()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          </button>
          <button class="hdr-btn" title="Add document" (click)="openDialog()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </button>
        </div>
      </header>

      <div class="content">
        <div class="search-wrap">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="search" placeholder="Search GO number / subject / date" [(ngModel)]="q">
        </div>

        <select class="category-filter" [ngModel]="activeCategory()" (ngModelChange)="activeCategory.set($event)">
          <option value="All">All categories</option>
          @for (c of categories; track c) {
            <option [value]="c">{{ c }}</option>
          }
        </select>

        <div class="chips">
          @for (f of filters; track f) {
            <button class="chip" [class.active]="activeFilter() === f" (click)="activeFilter.set(f)">{{ f }}</button>
          }
        </div>

        @if (loading()) {
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading documents...</p>
          </div>
        } @else {
          <p class="count">{{ filtered().length }} document{{ filtered().length !== 1 ? 's' : '' }}</p>

          @for (doc of filtered(); track doc.id) {
            <div class="doc-card" (click)="openDoc(doc)">
              <div class="doc-icon" [class]="doc.type.toLowerCase()">
                @if (doc.type === 'PDF') {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 13h2.5c.83 0 1.5.67 1.5 1.5S11.33 16 10.5 16H9v2H8v-5zm5 0h2c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2h-2v-5zm-4 1v1h1.5a.5.5 0 000-1H9zm5 0v3h1a1 1 0 001-1v-1a1 1 0 00-1-1h-1z"/></svg>
                } @else if (doc.type === 'IMG') {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z"/></svg>
                } @else if (doc.type === 'DOC') {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 12h8v1.5H8V12zm0 3h8v1.5H8V15zm0 3h5v1.5H8V18z"/></svg>
                } @else if (doc.type === 'XLS') {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 12h3v2H8v-2zm5 0h3v2h-3v-2zm-5 3h3v2H8v-2zm5 0h3v2h-3v-2z"/></svg>
                } @else {
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5z"/></svg>
                }
              </div>
              <div class="doc-info">
                <b>{{ doc.meta?.fileName ?? displayName(doc.name) }}</b>
                @if (doc.meta) {
                  <span class="subject">{{ doc.meta.subject }}</span>
                  <span class="meta">
                    <span class="cat-tag">{{ doc.meta.category }}</span>
                    {{ formatGoDate(doc.meta.goDate) }} &bull; {{ formatSize(doc.size) }}
                  </span>
                } @else {
                  <span class="meta">{{ formatDate(doc.created_at) }} &bull; {{ formatSize(doc.size) }}</span>
                }
              </div>
              <button class="delete-btn" (click)="deleteDoc(doc, $event)" title="Delete">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
          }

          @if (!filtered().length) {
            <div class="empty">
              <div class="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
              </div>
              <p>No documents found</p>
              <button class="add-link" (click)="openDialog()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Add document
              </button>
            </div>
          }
        }

        @if (dialogOpen()) {
          <div class="overlay" (click)="closeDialog()">
            <form class="dialog" (click)="$event.stopPropagation()" (ngSubmit)="submitUpload()">
              <div class="dialog-head">
                <div class="head-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>
                </div>
                <div class="head-text">
                  <h2>Add GO / Circular</h2>
                  <p>Attach the document and fill in its details</p>
                </div>
                <button type="button" class="close-btn" (click)="closeDialog()" [disabled]="uploading()" title="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                </button>
              </div>

              <div class="dialog-body">
                @if (pendingFile(); as file) {
                  <div class="file-card">
                    <div class="file-badge" [class]="fileBadgeClass(file.name)">{{ fileExt(file.name) }}</div>
                    <div class="file-info">
                      <b>{{ file.name }}</b>
                      <span>{{ formatSize(file.size) }}</span>
                    </div>
                    <label class="file-change" [class.disabled]="uploading()">
                      Change
                      <input type="file" hidden [disabled]="uploading()"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                        (change)="pickFile($event)">
                    </label>
                  </div>
                } @else {
                  <label class="dropzone" [class.drag]="dragOver()"
                    (dragover)="onDragOver($event)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
                    <div class="drop-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
                    </div>
                    <b>Tap to choose a file</b>
                    <span>or drag &amp; drop it here</span>
                    <small>PDF, Word, Excel or image</small>
                    <input type="file" hidden
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                      (change)="pickFile($event)">
                  </label>
                }

                <div class="field">
                  <span class="field-label">File Name <i>*</i></span>
                  <div class="input-wrap">
                    <svg class="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                    <input name="fileName" [(ngModel)]="form.fileName" required maxlength="150" placeholder="e.g. G.O.Ms.No.123">
                  </div>
                </div>

                <div class="field">
                  <span class="field-label">Subject <i>*</i></span>
                  <textarea name="subject" [(ngModel)]="form.subject" required maxlength="500" rows="3"
                    placeholder="Brief description of the GO / circular"></textarea>
                  <span class="counter">{{ form.subject.length }}/500</span>
                </div>

                <div class="field">
                  <span class="field-label">Date <i>*</i></span>
                  <div class="input-wrap">
                    <svg class="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
                    <input name="goDate" type="date" [(ngModel)]="form.goDate" required>
                  </div>
                </div>

                <div class="field">
                  <span class="field-label">Category <i>*</i></span>
                  <div class="cat-options">
                    @for (c of categories; track c; let i = $index) {
                      <button type="button" class="cat-option" [class.selected]="form.category === c" (click)="form.category = c">
                        <span class="cat-icon c{{ i }}">
                          @if (i === 0) {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/></svg>
                          } @else if (i === 1) {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>
                          } @else {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                          }
                        </span>
                        <span class="cat-label">{{ c }}</span>
                        <span class="cat-check">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        </span>
                      </button>
                    }
                  </div>
                </div>

                @if (dialogError()) {
                  <div class="dialog-error">{{ dialogError() }}</div>
                }
              </div>

              <div class="dialog-actions">
                <button type="button" class="btn-secondary" (click)="closeDialog()" [disabled]="uploading()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="!isFormValid() || uploading()">
                  @if (uploading()) {
                    <span class="btn-spinner"></span>
                    {{ compressing() ? 'Compressing...' : 'Uploading...' }}
                  } @else {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/></svg>
                    Upload
                  }
                </button>
              </div>
            </form>
          </div>
        }
        @if (savedMsg()) {
          <div class="toast saved-toast">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            {{ savedMsg() }}
          </div>
        }
        @if (error()) {
          <div class="toast error-toast" (click)="error.set('')">
            {{ error() }} &times;
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f0f4f8; font-family: system-ui, -apple-system, sans-serif; }

    /* Header */
    header {
      background: linear-gradient(135deg, #1a3a4a 0%, #1e4d5e 100%);
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      position: sticky;
      top: 0;
      z-index: 5;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    header h1 { margin: 0; font-size: 20px; font-weight: 700; flex: 1; letter-spacing: -0.3px; }
    .back {
      background: none; border: none; color: #fff; cursor: pointer;
      padding: 6px; border-radius: 8px; display: flex; align-items: center;
    }
    .back:hover { background: rgba(255,255,255,0.12); }
    .header-actions { display: flex; gap: 2px; align-items: center; }
    .hdr-btn {
      background: none; border: none; color: #fff;
      cursor: pointer; padding: 8px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .hdr-btn:hover { background: rgba(255,255,255,0.12); }

    /* Search */
    .content { padding: 16px 20px; max-width: 600px; margin: 0 auto; }
    .search-wrap {
      position: relative;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    .search {
      width: 100%;
      padding: 14px 16px 14px 42px;
      border: 1px solid #e0e0e0;
      border-radius: 14px;
      font-size: 15px;
      background: #fff;
      box-sizing: border-box;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search:focus { outline: none; border-color: #1a3a4a; box-shadow: 0 0 0 3px rgba(26,58,74,0.1); }

    /* Filter chips */
    .chips { display: flex; gap: 8px; margin: 16px 0 12px; flex-wrap: wrap; }
    .chip {
      padding: 8px 20px;
      border-radius: 24px;
      border: 1.5px solid #d0d5dd;
      background: #fff;
      font-size: 14px;
      cursor: pointer;
      font-weight: 500;
      color: #555;
      transition: all 0.2s;
    }
    .chip:hover { border-color: #1a3a4a; color: #1a3a4a; }
    .chip.active {
      background: #1a3a4a;
      color: #fff;
      border-color: #1a3a4a;
    }
    .count { font-size: 13px; color: #888; margin: 4px 0 12px; }

    /* Document card */
    .doc-card {
      display: flex;
      gap: 14px;
      align-items: center;
      background: #fff;
      border-radius: 16px;
      padding: 14px 16px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      border: 1px solid #f0f0f0;
    }
    .doc-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .doc-card:active { transform: translateY(0); }
    .doc-icon {
      width: 48px; height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      flex-shrink: 0;
    }
    .doc-icon.pdf { background: linear-gradient(135deg, #7b1fa2, #9c27b0); }
    .doc-icon.doc { background: linear-gradient(135deg, #1565c0, #1e88e5); }
    .doc-icon.img { background: linear-gradient(135deg, #2e7d32, #43a047); }
    .doc-icon.xls { background: linear-gradient(135deg, #0d7c3f, #2e7d32); }
    .doc-icon.file { background: linear-gradient(135deg, #455a64, #607d8b); }
    .doc-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
    .doc-info b {
      font-size: 15px; color: #1a3a4a; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .meta { font-size: 12px; color: #999; letter-spacing: 0.1px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .subject {
      font-size: 13px; color: #555;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cat-tag {
      background: #e3eef3; color: #1a3a4a;
      padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 11px;
    }
    .category-filter {
      width: 100%; margin-top: 12px; padding: 12px 14px;
      border: 1px solid #e0e0e0; border-radius: 14px;
      font-size: 14px; background: #fff; color: #333;
    }
    .category-filter:focus { outline: none; border-color: #1a3a4a; }
    .delete-btn {
      background: none; border: none; color: #bbb;
      cursor: pointer; padding: 8px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center;
      transition: color 0.2s, background 0.2s;
    }
    .delete-btn:hover { color: #c62828; background: #fdecea; }

    /* Empty state */
    .empty {
      text-align: center; padding: 48px 20px; color: #999;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .empty-icon { margin-bottom: 8px; }
    .empty p { font-size: 16px; margin: 0; }
    .add-link {
      background: none; border: none; font-family: inherit;
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 8px; color: #1565c0;
      font-weight: 600; cursor: pointer; font-size: 15px;
      padding: 10px 20px; border-radius: 10px;
      transition: background 0.2s;
    }
    .add-link:hover { background: rgba(21,101,192,0.08); }

    /* Loading */
    .loading {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px; gap: 14px;
    }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid #e0e0e0;
      border-top-color: #1a3a4a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading p { color: #888; font-size: 14px; margin: 0; }

    /* Toasts */
    .toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      padding: 14px 24px; border-radius: 14px;
      font-size: 14px; font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      z-index: 10; display: flex; align-items: center; gap: 10px;
      max-width: 90vw;
    }
    .upload-toast { background: #1a3a4a; color: #fff; }
    .toast-spinner {
      width: 18px; height: 18px;
      border: 2.5px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .saved-toast { background: #2e7d32; color: #fff; }
    .error-toast { background: #c62828; color: #fff; cursor: pointer; }

    /* Upload dialog */
    .overlay {
      position: fixed; inset: 0; z-index: 20; padding: 16px;
      background: rgba(15,30,40,0.55); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      animation: fade-in 0.2s ease-out;
    }
    .dialog {
      background: #fff; border-radius: 22px; overflow: hidden;
      width: 100%; max-width: 480px; max-height: 92vh;
      display: flex; flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,0.3);
      animation: pop-in 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2);
    }
    @keyframes fade-in { from { opacity: 0; } }
    @keyframes pop-in { from { opacity: 0; transform: translateY(16px) scale(0.97); } }

    .dialog-head {
      display: flex; align-items: center; gap: 14px;
      padding: 20px 20px 18px;
      background: linear-gradient(135deg, #1a3a4a 0%, #1e4d5e 100%); color: #fff;
    }
    .head-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      background: rgba(255,255,255,0.14);
      display: flex; align-items: center; justify-content: center;
    }
    .head-text { flex: 1; min-width: 0; }
    .head-text h2 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.2px; }
    .head-text p { margin: 3px 0 0; font-size: 13px; opacity: 0.75; }
    .close-btn {
      background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer;
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .close-btn:hover:not(:disabled) { background: rgba(255,255,255,0.22); }
    .close-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .dialog-body {
      padding: 18px 20px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 16px;
    }

    /* File picker */
    .dropzone {
      border: 2px dashed #c5d3dc; border-radius: 16px; background: #f6f9fb;
      padding: 16px; cursor: pointer; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      transition: border-color 0.2s, background 0.2s;
    }
    .dropzone:hover, .dropzone.drag { border-color: #1e4d5e; background: #eaf2f6; }
    .drop-icon {
      width: 46px; height: 46px; border-radius: 50%; margin-bottom: 6px;
      background: #fff; color: #1e4d5e; box-shadow: 0 2px 8px rgba(26,58,74,0.12);
      display: flex; align-items: center; justify-content: center;
    }
    .dropzone b { font-size: 15px; color: #1a3a4a; }
    .dropzone span { font-size: 13px; color: #667; }
    .dropzone small { font-size: 12px; color: #99a; margin-top: 4px; }

    .file-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 14px;
      background: #f6f9fb; border: 1px solid #e1e9ee;
      animation: fade-in 0.2s ease-out;
    }
    .file-badge {
      width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0;
      color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #455a64, #607d8b);
    }
    .file-badge.pdf { background: linear-gradient(135deg, #7b1fa2, #9c27b0); }
    .file-badge.doc { background: linear-gradient(135deg, #1565c0, #1e88e5); }
    .file-badge.xls { background: linear-gradient(135deg, #0d7c3f, #2e7d32); }
    .file-badge.img { background: linear-gradient(135deg, #2e7d32, #43a047); }
    .file-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .file-info b { font-size: 14px; color: #1a3a4a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-info span { font-size: 12px; color: #889; }
    .file-change {
      font-size: 13px; font-weight: 600; color: #1565c0; cursor: pointer;
      padding: 8px 12px; border-radius: 8px; transition: background 0.2s;
    }
    .file-change:hover { background: rgba(21,101,192,0.08); }
    .file-change.disabled { opacity: 0.4; pointer-events: none; }

    /* Fields */
    .field { display: flex; flex-direction: column; gap: 7px; position: relative; }
    .field-label { font-size: 13px; font-weight: 600; color: #34495e; }
    .field-label i { color: #c62828; font-style: normal; }
    .input-wrap { position: relative; }
    .field-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #8a9ba8; pointer-events: none; }
    .field input, .field textarea {
      width: 100%; box-sizing: border-box;
      padding: 12px 14px; border: 1.5px solid #dde4ea; border-radius: 12px;
      font-size: 15px; font-family: inherit; color: #1a2b36; background: #fff;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-wrap input { padding-left: 40px; }
    .field textarea { resize: vertical; min-height: 84px; }
    .field input::placeholder, .field textarea::placeholder { color: #a8b4bd; }
    .field input:focus, .field textarea:focus {
      outline: none; border-color: #1e4d5e; box-shadow: 0 0 0 4px rgba(30,77,94,0.1);
    }
    .counter { position: absolute; right: 10px; bottom: 8px; font-size: 11px; color: #a8b4bd; pointer-events: none; }

    /* Category cards */
    .cat-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .cat-option {
      position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%;
      padding: 14px 8px 12px; border-radius: 12px; cursor: pointer; text-align: center;
      border: 1.5px solid #dde4ea; background: #fff; font-family: inherit;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    }
    .cat-option:hover { border-color: #9fb5c2; }
    .cat-option.selected { border-color: #1e4d5e; background: #f0f6f9; box-shadow: 0 0 0 3px rgba(30,77,94,0.08); }
    .cat-icon {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .cat-icon.c0 { background: #e8f0fe; color: #1a5fb4; }
    .cat-icon.c1 { background: #fff3e0; color: #c25e00; }
    .cat-icon.c2 { background: #e6f4ea; color: #1e7e34; }
    .cat-label { font-size: 13px; font-weight: 600; color: #2c3e50; line-height: 1.25; }
    .cat-check {
      position: absolute; top: 6px; right: 6px;
      width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
      border: 1.5px solid #cfd8de; color: transparent;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .cat-option.selected .cat-check { background: #1e4d5e; border-color: #1e4d5e; color: #fff; }

    .dialog-error {
      background: #fdecea; color: #b71c1c; border-radius: 10px;
      padding: 10px 12px; font-size: 13px;
    }

    .dialog-actions {
      display: flex; gap: 10px; padding: 14px 20px 18px;
      border-top: 1px solid #eef2f5; background: #fafcfd;
    }
    .btn-primary, .btn-secondary {
      padding: 13px 20px; border-radius: 12px; font-size: 15px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
    }
    .btn-secondary { background: #fff; color: #1a3a4a; border: 1.5px solid #d0d9e0; }
    .btn-secondary:hover:not(:disabled) { background: #f3f6f8; }
    .btn-primary {
      flex: 1; border: none; color: #fff;
      background: linear-gradient(135deg, #1a3a4a 0%, #1e4d5e 100%);
      box-shadow: 0 4px 12px rgba(26,58,74,0.25);
    }
    .btn-primary:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(26,58,74,0.35); }
    .btn-primary:active:not(:disabled) { transform: scale(0.98); }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
    .btn-spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }

    /* Bottom sheet on phones */
    @media (max-width: 520px) {
      .overlay { align-items: flex-end; padding: 0; }
      .dialog { max-width: none; border-radius: 22px 22px 0 0; max-height: 94vh; animation: slide-up 0.28s ease-out; }
      .cat-options { grid-template-columns: 1fr; }
      .cat-option { flex-direction: row; text-align: left; padding: 11px 14px; gap: 12px; }
      .cat-label { flex: 1; font-size: 14px; }
      .cat-check { position: static; }
      @keyframes slide-up { from { transform: translateY(100%); } }
    }
  `],
})
export class GosComponent implements OnInit {
  filters = ['All', 'PDF', 'DOC', 'IMG'];
  categories = GO_CATEGORIES;
  activeFilter = signal('All');
  activeCategory = signal<'All' | GoCategory>('All');
  dialogOpen = signal(false);
  pendingFile = signal<File | null>(null);
  dragOver = signal(false);
  dialogError = signal('');
  form = this.emptyForm();
  docs = signal<StoredDoc[]>([]);
  loading = signal(false);
  uploading = signal(false);
  compressing = signal(false);
  savedMsg = signal('');
  error = signal('');
  q = '';

  constructor(private router: Router, private drive: SupabaseService) {}

  ngOnInit() { this.loadFiles(); }

  async loadFiles() {
    this.loading.set(true);
    this.error.set('');
    try {
      const files = await this.drive.listFiles();
      this.docs.set(files);
    } catch (e: any) {
      this.error.set('Failed to load files: ' + (e.message || e));
    } finally {
      this.loading.set(false);
    }
  }

  openDialog() {
    this.form = this.emptyForm();
    this.pendingFile.set(null);
    this.dialogError.set('');
    this.dialogOpen.set(true);
  }

  closeDialog() {
    if (this.uploading()) return;
    this.dialogOpen.set(false);
  }

  pickFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.setFile(file);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragOver.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File) {
    this.pendingFile.set(file);
    this.dialogError.set('');
    if (!this.form.fileName.trim()) {
      this.form.fileName = file.name.replace(/\.[^.]+$/, '').slice(0, 150);
    }
  }

  fileExt(name: string): string {
    return (name.split('.').pop() || 'file').toUpperCase().slice(0, 4);
  }

  fileBadgeClass(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'doc';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'img';
    return '';
  }

  isFormValid(): boolean {
    const { fileName, subject, goDate, category } = this.form;
    return !!this.pendingFile() && !!fileName.trim() && !!subject.trim() && /^\d{4}-\d{2}-\d{2}$/.test(goDate)
      && (GO_CATEGORIES as readonly string[]).includes(category);
  }

  async submitUpload() {
    const file = this.pendingFile();
    if (!file || !this.isFormValid() || this.uploading()) return;

    const meta: DocMeta = {
      fileName: this.form.fileName.trim(),
      subject: this.form.subject.trim(),
      goDate: this.form.goDate,
      category: this.form.category as GoCategory,
    };

    this.uploading.set(true);
    this.compressing.set(true);
    this.dialogError.set('');
    this.savedMsg.set('');
    try {
      const doc = await this.drive.uploadFile(file, meta);
      this.docs.update(d => [doc, ...d]);
      this.dialogOpen.set(false);
      if (file.size > doc.size) {
        const saved = ((1 - doc.size / file.size) * 100).toFixed(0);
        this.savedMsg.set(`${this.formatSize(file.size)} → ${this.formatSize(doc.size)} (${saved}% saved)`);
      } else {
        this.savedMsg.set('Uploaded');
      }
      setTimeout(() => this.savedMsg.set(''), 5000);
    } catch (e: any) {
      this.dialogError.set(`Upload failed: ${e.message || e}`);
    } finally {
      this.uploading.set(false);
      this.compressing.set(false);
    }
  }

  async deleteDoc(doc: StoredDoc, ev: Event) {
    ev.stopPropagation();
    try {
      await this.drive.deleteFile(doc.name);
      this.docs.update(d => d.filter(x => x.id !== doc.id));
    } catch (e: any) {
      this.error.set('Failed to delete: ' + (e.message || e));
    }
  }

  openDoc(doc: StoredDoc) {
    window.open(doc.url, '_blank');
  }

  filtered(): StoredDoc[] {
    const f = this.activeFilter();
    const c = this.activeCategory();
    const t = this.q.trim().toLowerCase();
    return this.docs().filter(d => {
      if (f !== 'All' && d.type !== f) return false;
      if (c !== 'All' && d.meta?.category !== c) return false;
      if (t && !this.searchText(d).includes(t)) return false;
      return true;
    });
  }

  private searchText(d: StoredDoc): string {
    const m = d.meta;
    return [d.name, m?.fileName, m?.subject, m?.category, m && formatGoDate(m.goDate), m?.goDate]
      .filter(Boolean).join(' ').toLowerCase();
  }

  private emptyForm() {
    return { fileName: '', subject: '', goDate: todayYmd(), category: '' as GoCategory | '' };
  }

  displayName(name: string): string {
    return name.replace(/^\d+_/, '').replace(/\.[^.]+$/, '');
  }

  formatDate(iso: string): string { return formatDate(iso); }
  formatGoDate(ymd: string): string { return formatGoDate(ymd); }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  goBack() { this.router.navigate(['/']); }
}
