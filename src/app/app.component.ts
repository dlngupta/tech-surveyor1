import { Component, AfterViewInit, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import maplibregl from 'maplibre-gl';
import { kml } from '@tmcw/togeojson';
import JSZip from 'jszip';
import * as turf from '@turf/turf';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const SRC: Record<string, string> = {
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  sat: ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ter: ESRI + 'World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
  lab: ESRI + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
};
interface Lyr { id: string; name: string; fc: any; color: string; opacity: number; width: number; visible: boolean; }

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="map-page">
    <header>
      <button class="back" (click)="goBack()">&larr; Back</button>
      <h1>Tech Surveyor</h1>
      <label class="kml-btn">KML<input type="file" accept=".kml,.kmz" hidden (change)="open($event)"></label>
    </header>

    <div class="map-wrap">
      <div id="map"></div>
      <button class="base-chip" (click)="cycleBase()">Map: {{ baseLabel() }}</button>
    </div>

    <div class="bottom-bar">
      <button class="tab" [class.active]="activeTab() === 'map'" (click)="setTab('map')">
        <span class="tab-icon">&#x1F5FA;</span><span>Map</span>
      </button>
      <button class="tab" [class.active]="activeTab() === 'layers'" (click)="setTab('layers')">
        <span class="tab-icon">&#x1F4DA;</span><span>Layers</span>
      </button>
      <button class="tab" [class.active]="activeTab() === 'measure'" (click)="setTab('measure')">
        <span class="tab-icon">&#x1F4D0;</span><span>Measure</span>
      </button>
      <button class="tab" [class.active]="activeTab() === 'search'" (click)="setTab('search')">
        <span class="tab-icon">&#x1F50D;</span><span>Search</span>
      </button>
    </div>

    @if (activeTab() === 'layers') {
      <div class="panel layers-panel">
        <div class="panel-header"><b>Layers</b><button (click)="setTab('map')">&#x2715;</button></div>
        @if (!layers().length) { <p class="empty">No KML layers loaded. Tap KML to import.</p> }
        @for (l of layers(); track l.id) {
          <div class="lyr">
            <label><input type="checkbox" [checked]="l.visible" (change)="toggle(l)"> {{ l.name }}</label>
            <button class="rm" (click)="remove(l)">&#x2715;</button><br>
            <div class="controls">
              <input type="color" [value]="l.color" (input)="style(l,'color',$any($event.target).value)">
              <span>Fill</span>
              <input type="range" min="0" max="1" step="0.05" [value]="l.opacity" (input)="style(l,'opacity',+$any($event.target).value)">
              <span>Width</span>
              <input type="range" min="1" max="8" [value]="l.width" (input)="style(l,'width',+$any($event.target).value)">
            </div>
          </div>
        }
      </div>
    }

    @if (activeTab() === 'measure') {
      <div class="panel measure-panel">
        <div class="panel-header"><b>Measure</b><button (click)="setTab('map')">&#x2715;</button></div>
        <div class="measure-btns">
          <button [class.on]="mode==='dist'" (click)="setMode('dist')">Distance</button>
          <button [class.on]="mode==='area'" (click)="setMode('area')">Area</button>
          <button (click)="setMode('')">Clear</button>
        </div>
        <p class="measure-result">{{ result() || 'Tap points on the map to measure' }}</p>
      </div>
    }

    @if (activeTab() === 'search') {
      <div class="panel search-panel">
        <div class="panel-header"><b>Search</b><button (click)="setTab('map')">&#x2715;</button></div>
        <div class="search-row">
          <input placeholder="Survey No / Pattadar / label" [(ngModel)]="q" (keyup.enter)="search()">
          <button (click)="search()">Find</button>
        </div>
        <p class="search-msg">{{ msg() }}</p>
      </div>
    }
  </div>
  `,
  styles: [`
    .map-page { height: 100vh; display: flex; flex-direction: column; font-family: system-ui, sans-serif; }
    header {
      background: #1a3a4a;
      color: #fff;
      display: flex;
      align-items: center;
      padding: 12px 16px;
      gap: 12px;
      z-index: 5;
      flex-shrink: 0;
    }
    header h1 { margin: 0; font-size: 18px; font-weight: 700; flex: 1; text-align: center; }
    .back {
      background: none; border: none; color: #fff; font-size: 15px; cursor: pointer;
      padding: 4px 8px; white-space: nowrap;
    }
    .kml-btn {
      background: none; border: 1px solid rgba(255,255,255,0.4); color: #fff;
      padding: 6px 14px; border-radius: 6px; font-size: 14px; cursor: pointer;
      font-weight: 600;
    }
    .map-wrap { flex: 1; position: relative; }
    #map { position: absolute; inset: 0; }
    .base-chip {
      position: absolute; top: 10px; left: 10px; z-index: 2;
      background: #fff; border: 1px solid #ccc; border-radius: 20px;
      padding: 6px 14px; font-size: 13px; cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    }
    .bottom-bar {
      display: flex;
      background: #fff;
      border-top: 1px solid #ddd;
      flex-shrink: 0;
      z-index: 5;
    }
    .tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 10px 0;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 12px;
      color: #666;
    }
    .tab.active { color: #1a3a4a; font-weight: 700; }
    .tab-icon { font-size: 20px; }
    .panel {
      position: absolute;
      bottom: 52px;
      left: 0; right: 0;
      background: #fff;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      padding: 16px 20px;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.12);
      z-index: 4;
      max-height: 50vh;
      overflow: auto;
    }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .panel-header b { font-size: 18px; }
    .panel-header button { background: none; border: none; font-size: 20px; cursor: pointer; color: #666; }
    .lyr { border-top: 1px solid #eee; padding: 10px 0; }
    .lyr label { font-size: 14px; }
    .rm { background: none; border: none; color: #c62828; cursor: pointer; float: right; font-size: 16px; }
    .controls { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 12px; color: #666; }
    .controls input[type=range] { flex: 1; }
    .controls input[type=color] { width: 28px; height: 28px; border: none; padding: 0; cursor: pointer; }
    .empty { color: #999; font-size: 14px; text-align: center; }
    .measure-btns { display: flex; gap: 8px; }
    .measure-btns button {
      flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 8px;
      background: #fff; cursor: pointer; font-size: 14px;
    }
    .measure-btns button.on { background: #1a3a4a; color: #fff; border-color: #1a3a4a; }
    .measure-result { font-size: 15px; color: #333; margin-top: 12px; }
    .search-row { display: flex; gap: 8px; }
    .search-row input {
      flex: 1; padding: 10px 14px; border: 1px solid #ccc; border-radius: 8px; font-size: 14px;
    }
    .search-row button {
      padding: 10px 18px; background: #1a3a4a; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; cursor: pointer;
    }
    .search-msg { font-size: 14px; color: #666; margin-top: 8px; }
  `],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  map!: maplibregl.Map;
  base = signal('sat');
  layers = signal<Lyr[]>([]);
  result = signal(''); msg = signal('');
  mode: '' | 'dist' | 'area' = '';
  pts: number[][] = [];
  q = '';
  activeTab = signal<'map' | 'layers' | 'measure' | 'search'>('map');

  private bases = ['sat', 'osm', 'ter'];
  private baseLabels: Record<string, string> = { sat: 'Hybrid', osm: 'Street', ter: 'Terrain' };

  constructor(private router: Router) {}

  baseLabel() { return this.baseLabels[this.base()] || 'Hybrid'; }

  cycleBase() {
    const i = (this.bases.indexOf(this.base()) + 1) % this.bases.length;
    this.setBase(this.bases[i]);
  }

  setTab(t: 'map' | 'layers' | 'measure' | 'search') { this.activeTab.set(t); }

  ngAfterViewInit() {
    const sources: any = {};
    Object.keys(SRC).forEach(k => (sources[k] = { type: 'raster', tiles: [SRC[k]], tileSize: 256, maxzoom: 19 }));
    this.map = new maplibregl.Map({
      container: 'map', center: [79.7, 16.3], zoom: 6,
      style: { version: 8, sources, layers: Object.keys(SRC).map(k => ({ id: k, type: 'raster', source: k })) } as any,
    });
    this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    this.map.on('load', () => {
      this.map.addSource('measure', { type: 'geojson', data: turf.featureCollection([]) });
      this.map.addLayer({ id: 'm-fill', type: 'fill', source: 'measure', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#f80', 'fill-opacity': 0.3 } });
      this.map.addLayer({ id: 'm-line', type: 'line', source: 'measure', paint: { 'line-color': '#f80', 'line-width': 3 } });
      this.map.addLayer({ id: 'm-pt', type: 'circle', source: 'measure', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': '#f80', 'circle-radius': 5 } });
      this.setBase('sat');
    });
    this.map.on('click', e => this.measureClick(e.lngLat));
  }

  ngOnDestroy() { this.map?.remove(); }

  setBase(b: string) {
    this.base.set(b);
    const vis = (id: string, on: boolean) => this.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    vis('osm', b === 'osm'); vis('sat', b === 'sat'); vis('ter', b === 'ter'); vis('lab', b === 'sat');
  }

  async open(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      let text: string;
      if (f.name.toLowerCase().endsWith('.kmz')) {
        const zip = await JSZip.loadAsync(f);
        const entry = Object.values(zip.files).find(z => z.name.toLowerCase().endsWith('.kml'));
        text = await entry!.async('string');
      } else text = await f.text();
      const fc = kml(new DOMParser().parseFromString(text, 'text/xml'));
      this.addLayer(f.name, fc);
    } catch (e) { this.msg.set('Could not open KML/KMZ: ' + e); }
    (ev.target as HTMLInputElement).value = '';
  }

  addLayer(name: string, fc: any) {
    const id = 'k' + Date.now();
    const l: Lyr = { id, name, fc, color: '#e53935', opacity: 0.25, width: 2, visible: true };
    this.map.addSource(id, { type: 'geojson', data: fc });
    this.map.addLayer({ id: id + '-fill', type: 'fill', source: id, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': l.color, 'fill-opacity': l.opacity } });
    this.map.addLayer({ id: id + '-line', type: 'line', source: id, filter: ['!=', ['geometry-type'], 'Point'], paint: { 'line-color': l.color, 'line-width': l.width } });
    this.map.addLayer({ id: id + '-pt', type: 'circle', source: id, filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': l.color, 'circle-radius': 5 } });
    this.layers.update(a => [...a, l]);
    const b = turf.bbox(fc) as [number, number, number, number];
    if (b.every(isFinite)) this.map.fitBounds(b, { padding: 40 });
    this.msg.set(`${fc.features.length} features loaded`);
  }

  style(l: Lyr, k: 'color' | 'opacity' | 'width', v: any) {
    (l as any)[k] = v;
    if (k === 'color') { this.map.setPaintProperty(l.id + '-fill', 'fill-color', v); this.map.setPaintProperty(l.id + '-line', 'line-color', v); this.map.setPaintProperty(l.id + '-pt', 'circle-color', v); }
    if (k === 'opacity') this.map.setPaintProperty(l.id + '-fill', 'fill-opacity', v);
    if (k === 'width') this.map.setPaintProperty(l.id + '-line', 'line-width', v);
  }
  toggle(l: Lyr) {
    l.visible = !l.visible;
    ['-fill', '-line', '-pt'].forEach(s => this.map.setLayoutProperty(l.id + s, 'visibility', l.visible ? 'visible' : 'none'));
  }
  remove(l: Lyr) {
    ['-fill', '-line', '-pt'].forEach(s => this.map.removeLayer(l.id + s));
    this.map.removeSource(l.id);
    this.layers.update(a => a.filter(x => x.id !== l.id));
  }

  search() {
    const t = this.q.trim().toLowerCase(); if (!t) return;
    const hits = this.layers().flatMap(l => l.fc.features).filter((f: any) => JSON.stringify(f.properties || {}).toLowerCase().includes(t));
    if (!hits.length) { this.msg.set('No matching feature'); return; }
    this.map.fitBounds(turf.bbox(turf.featureCollection(hits)) as any, { padding: 60, maxZoom: 18 });
    this.msg.set(`${hits.length} match(es)`);
  }

  setMode(m: '' | 'dist' | 'area') {
    this.mode = m; this.pts = []; this.result.set(m ? 'Tap points on the map' : '');
    this.draw();
  }
  measureClick(p: maplibregl.LngLat) {
    if (!this.mode) return;
    this.pts.push([p.lng, p.lat]); this.draw();
    if (this.mode === 'dist' && this.pts.length > 1) {
      this.result.set(`Length: ${turf.length(turf.lineString(this.pts), { units: 'meters' }).toFixed(2)} m`);
    } else if (this.mode === 'area' && this.pts.length > 2) {
      const a = turf.area(turf.polygon([[...this.pts, this.pts[0]]]));
      this.result.set(`Area: ${a.toFixed(2)} m² / ${(a / 4046.8564224).toFixed(4)} acres`);
    }
  }
  draw() {
    const fs: any[] = this.pts.map(p => turf.point(p));
    if (this.pts.length > 1) fs.push(this.mode === 'area' && this.pts.length > 2 ? turf.polygon([[...this.pts, this.pts[0]]]) : turf.lineString(this.pts));
    (this.map.getSource('measure') as maplibregl.GeoJSONSource)?.setData(turf.featureCollection(fs));
  }

  goBack() { this.router.navigate(['/']); }
}
