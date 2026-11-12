/* The collision shape follows the composited video, including its transparent holes. */
'use strict';

class PetCollisionFrame {
  constructor(spriteElement, publish) {
    this.spriteElement = spriteElement;
    this.publish = publish;
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  watch(video) {
    this.previousPaint = this.paint;
    this.previousVideo = this.video !== video ? this.video : null;
    this.previousContactTop = this.contactTop;
    this.handoffUntil = performance.now() + 200;
    this.stop();
    this.video = video;
    // Reset the canvas (and its origin-clean flag) for the new source.
    const scale = 160 / Math.max(video.videoWidth, video.videoHeight);
    this.canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    this.canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    this.context.imageSmoothingQuality = 'medium';
    const sample = () => {
      if (this.video !== video) return;
      try {
        const { width, height } = this.canvas;
        this.context.clearRect(0, 0, width, height);
        this.context.drawImage(video, 0, 0, width, height);
        const pixels = this.context.getImageData(0, 0, width, height).data;
        let peak = 0, left = width, right = 0, top = height, bottom = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alpha = pixels[4 * (y * width + x) + 3];
            if (!alpha) continue;
            peak = Math.max(peak, alpha);
            left = Math.min(left,x); right = Math.max(right,x+1);
            top = Math.min(top,y); bottom = y+1;
          }
        }
        this.ink = peak ? {left,right,top,bottom} : null;
        // Ignore faint fringes and shadows while supporting translucent characters.
        const threshold = Math.max(16, Math.ceil(peak * 0.75));
        // One triple per opaque horizontal run. Separate runs retain arm/leg gaps.
        let runs = '';
        for (let y = 0; y < height; y++) {
          let start = -1;
          for (let x = 0; x <= width; x++) {
            const solid = x < width && pixels[4 * (y * width + x) + 3] >= threshold;
            if (solid && start < 0) start = x;
            if (!solid && start >= 0) {
              runs += String.fromCharCode(y, start, x);
              start = -1;
            }
          }
        }
        // Runs are emitted from the top row down. Reuse the same opaque outline
        // as pet-to-pet contact, including when the whole sprite is translucent.
        this.firstSolidRow = runs.length ? runs.charCodeAt(0) : null;
        this.runs = btoa(runs);
        this.updateLayout();
      } catch (error) {
        this.runs = '';
        this.updateLayout();
        if (error.name === 'SecurityError') return;
      }
      this.callback = video.requestVideoFrameCallback(sample);
    };
    sample();
  }

  updateLayout() {
    const video = this.video;
    if (!video || !this.ink || !this.runs) {
      this.paint = this.contactTop = null;
      if (this.last !== null) this.publish(null);
      this.last = null;
      return;
    }
    // object-fit: contain is applied before the CSS flip/squash. The DOM
    // bounds already include the stage offset, custom layout and transform origin.
    const style = getComputedStyle(video);
    const boxAspect = parseFloat(style.width) / parseFloat(style.height);
    const sourceAspect = video.videoWidth / video.videoHeight;
    const rect = video.getBoundingClientRect();
    const base = this.spriteElement.getBoundingClientRect();
    const width = rect.width * Math.min(1, sourceAspect / boxAspect);
    const height = rect.height * Math.min(1, boxAspect / sourceAspect);
    const shape = {
      x: toScreen(rect.left - base.left + (rect.width - width) / 2),
      y: toScreen(rect.top - base.top + (rect.height - height) / 2),
      w: toScreen(width), h: toScreen(height),
      cols: this.canvas.width, rows: this.canvas.height,
      flip: video.style.transform.includes('scaleX(-1)'), runs: this.runs,
    };
    const ink = this.ink;
    const cw = width / shape.cols, ch = height / shape.rows;
    this.contactTop = toLocal(shape.y) + ch * this.firstSolidRow;
    this.paint = {
      left: toLocal(shape.x) + cw * (shape.flip ? shape.cols - ink.right : ink.left),
      right: toLocal(shape.x) + cw * (shape.flip ? shape.cols - ink.left : ink.right),
      top: toLocal(shape.y) + ch * ink.top,
      bottom: toLocal(shape.y) + ch * ink.bottom,
    };
    if (!this.last || Object.keys(shape).some(key => shape[key] !== this.last[key])) {
      this.last = shape;
      this.publish(shape);
    }
  }

  stop() {
    if (this.callback != null) this.video.cancelVideoFrameCallback(this.callback);
    this.callback = null;
    this.video = null;
    this.ink = this.paint = this.contactTop = null;
    this.runs = '';
  }
}
