/**
 * CameraController - Module điều khiển camera phụ, zoom in/out (0.6x - 3.0x) và đèn flash
 * Sử dụng WebRTC MediaStreamTrack Constraints & CSS Digital Zoom Fallback
 */
(function (window) {
  'use strict';

  class CameraController {
    constructor(options = {}) {
      this.container = typeof options.container === 'string'
        ? document.getElementById(options.container)
        : options.container;
      this.readerId = options.readerId;
      this.html5QrCode = options.html5QrCode || null;
      this.onCameraChanged = options.onCameraChanged || null;

      this.cameras = [];
      this.currentCameraIndex = 0;
      this.isTorchOn = false;
      this.currentZoom = 1.0;
      this.minZoom = 0.6;
      this.maxZoom = 3.0;
      this.stepZoom = 0.1;
      this.videoTrack = null;
      this.hasHardwareZoom = false;
      this.hasHardwareTorch = false;

      this.overlayEl = null;
    }

    isFrontCamera(device) {
      if (!device) return false;
      const label = (device.label || '').toLowerCase();
      return /front|trước|truoc|user|selfie|facing\s*front|face/i.test(label);
    }

    filterCameras(devices) {
      if (!Array.isArray(devices) || devices.length === 0) return [];
      // Lọc bỏ hoàn toàn camera trước (selfie/user)
      const rearAndAux = devices.filter(d => !this.isFrontCamera(d));
      if (rearAndAux.length > 0) {
        return rearAndAux;
      }
      // Giữ lại thiết bị nếu máy tính PC chỉ có duy nhất 1 webcam để test
      return devices;
    }

    async init() {
      if (!this.container) return;
      try {
        if (typeof Html5Qrcode !== 'undefined' && Html5Qrcode.getCameras) {
          const devices = await Html5Qrcode.getCameras();
          if (Array.isArray(devices) && devices.length > 0) {
            this.cameras = this.filterCameras(devices);
          }
        }
      } catch (e) {
        console.warn('CameraController: Lỗi lấy danh sách camera:', e);
      }
      this.renderOverlay();
      this.bindEvents();
    }

    setHtml5QrCode(instance) {
      this.html5QrCode = instance;
    }

    renderOverlay() {
      if (this.overlayEl) {
        this.overlayEl.remove();
      }

      this.overlayEl = document.createElement('div');
      this.overlayEl.className = 'camera-overlay-controls';
      this.overlayEl.innerHTML = `
        <div class="camera-overlay-toolbar-top">
          <button type="button" class="cam-overlay-btn" id="btnCamSwitch" title="Chuyển đổi camera" style="${this.cameras.length > 1 ? '' : 'display:none;'}">
            <i class="bi bi-arrow-repeat"></i>
            <span id="camLabelBadge" style="font-size:0.75rem;">Đổi Cam</span>
          </button>
          <button type="button" class="cam-overlay-btn" id="btnCamTorch" title="Bật/Tắt Đèn Flash">
            <i class="bi bi-lightning-charge"></i>
            <span id="camTorchText" style="font-size:0.75rem;">Flash</span>
          </button>
        </div>

        <div class="camera-overlay-zoom-bar">
          <div class="camera-zoom-presets">
            <button type="button" class="cam-zoom-btn" data-zoom="0.6">0.6x</button>
            <button type="button" class="cam-zoom-btn" data-zoom="0.8">0.8x</button>
            <button type="button" class="cam-zoom-btn active" data-zoom="1.0">1.0x</button>
            <button type="button" class="cam-zoom-btn" data-zoom="2.0">2.0x</button>
          </div>
          <div class="camera-zoom-slider-row">
            <button type="button" class="btn btn-sm btn-link text-white p-0 text-decoration-none" id="btnZoomOut" title="Thu nhỏ (Zoom out)" style="font-size: 1.05rem; line-height: 1;">
              <i class="bi bi-dash-circle"></i>
            </button>
            <input type="range" class="camera-zoom-slider" id="cameraZoomRange" min="0.6" max="3.0" step="0.1" value="1.0">
            <button type="button" class="btn btn-sm btn-link text-white p-0 text-decoration-none" id="btnZoomIn" title="Phóng to (Zoom in)" style="font-size: 1.05rem; line-height: 1;">
              <i class="bi bi-plus-circle"></i>
            </button>
            <span class="camera-zoom-val-badge" id="zoomValBadge">1.0x</span>
          </div>
        </div>
      `;

      this.container.style.position = 'relative';
      this.container.appendChild(this.overlayEl);
      this.updateCamLabel();
    }

    bindEvents() {
      const btnTorch = this.overlayEl.querySelector('#btnCamTorch');
      if (btnTorch) {
        btnTorch.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleTorch();
        });
      }

      const btnSwitch = this.overlayEl.querySelector('#btnCamSwitch');
      if (btnSwitch) {
        btnSwitch.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.switchCamera();
        });
      }

      const presetBtns = this.overlayEl.querySelectorAll('.cam-zoom-btn');
      presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const z = parseFloat(btn.getAttribute('data-zoom'));
          this.setZoom(z, true);
        });
      });

      const rangeInput = this.overlayEl.querySelector('#cameraZoomRange');
      if (rangeInput) {
        rangeInput.addEventListener('input', (e) => {
          const z = parseFloat(e.target.value);
          this.setZoom(z, false);
        });
      }

      const btnZoomOut = this.overlayEl.querySelector('#btnZoomOut');
      if (btnZoomOut) {
        btnZoomOut.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nextZ = Math.max(this.minZoom, Math.round((this.currentZoom - 0.1) * 10) / 10);
          this.setZoom(nextZ, true);
        });
      }

      const btnZoomIn = this.overlayEl.querySelector('#btnZoomIn');
      if (btnZoomIn) {
        btnZoomIn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nextZ = Math.min(this.maxZoom, Math.round((this.currentZoom + 0.1) * 10) / 10);
          this.setZoom(nextZ, true);
        });
      }
    }

    onScanStarted() {
      // Cho thời gian video gắn stream hoàn tất
      setTimeout(async () => {
        this.updateRunningTrack();
        await this.refreshCameras();
        if (this.currentZoom !== 1.0) {
          this.setZoom(this.currentZoom, true);
        }
        if (this.isTorchOn) {
          this.applyTorch(true);
        }
      }, 350);
    }

    updateRunningTrack() {
      try {
        const reader = document.getElementById(this.readerId);
        if (!reader) return;
        const video = reader.querySelector('video');
        if (video && video.srcObject) {
          const tracks = video.srcObject.getVideoTracks();
          if (tracks && tracks.length > 0) {
            this.videoTrack = tracks[0];
            const caps = typeof this.videoTrack.getCapabilities === 'function'
              ? this.videoTrack.getCapabilities()
              : {};

            this.hasHardwareTorch = !!caps.torch;
            this.hasHardwareZoom = !!caps.zoom;

            if (caps.zoom) {
              if (caps.zoom.min !== undefined && caps.zoom.min < 1) {
                this.minZoom = Math.max(0.5, caps.zoom.min);
              }
              if (caps.zoom.max !== undefined) {
                this.maxZoom = Math.min(5.0, caps.zoom.max);
              }
            }

            const btnTorch = this.overlayEl ? this.overlayEl.querySelector('#btnCamTorch') : null;
            if (btnTorch && !this.hasHardwareTorch) {
              // Vẫn giữ nút nhưng không bật sáng nếu không hỗ trợ
              btnTorch.title = 'Thiết bị này có thể không hỗ trợ đèn Flash';
            }
          }
        }
      } catch (e) {
        console.warn('CameraController: Không thể đọc capabilities:', e);
      }
    }

    async toggleTorch() {
      this.updateRunningTrack();
      const targetState = !this.isTorchOn;
      const success = await this.applyTorch(targetState);
      if (success) {
        this.isTorchOn = targetState;
      }
    }

    async applyTorch(state) {
      const btnTorch = this.overlayEl ? this.overlayEl.querySelector('#btnCamTorch') : null;
      let ok = false;

      try {
        if (this.videoTrack && typeof this.videoTrack.applyConstraints === 'function') {
          await this.videoTrack.applyConstraints({
            advanced: [{ torch: state }]
          });
          ok = true;
        } else if (this.html5QrCode && typeof this.html5QrCode.applyVideoConstraints === 'function') {
          await this.html5QrCode.applyVideoConstraints({
            advanced: [{ torch: state }]
          });
          ok = true;
        }
      } catch (err) {
        console.warn('CameraController: Lỗi bật/tắt flash:', err);
        ok = false;
      }

      if (btnTorch) {
        if (ok && state) {
          btnTorch.classList.add('torch-active');
          const icon = btnTorch.querySelector('i');
          if (icon) icon.className = 'bi bi-lightning-charge-fill';
        } else {
          btnTorch.classList.remove('torch-active');
          const icon = btnTorch.querySelector('i');
          if (icon) icon.className = 'bi bi-lightning-charge';
        }
      }
      return ok;
    }

    async setZoom(zoomLevel, updateSlider = true) {
      this.updateRunningTrack();
      const z = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(zoomLevel * 10) / 10));
      this.currentZoom = z;

      // Cập nhật giao diện
      if (this.overlayEl) {
        const badge = this.overlayEl.querySelector('#zoomValBadge');
        if (badge) badge.textContent = `${z.toFixed(1)}x`;

        if (updateSlider) {
          const slider = this.overlayEl.querySelector('#cameraZoomRange');
          if (slider) slider.value = z;
        }

        const presetBtns = this.overlayEl.querySelectorAll('.cam-zoom-btn');
        presetBtns.forEach(btn => {
          const pz = parseFloat(btn.getAttribute('data-zoom'));
          if (Math.abs(pz - z) < 0.05) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      // Hardware Zoom nếu có hỗ trợ
      let appliedHardware = false;
      try {
        if (this.videoTrack && this.hasHardwareZoom && typeof this.videoTrack.applyConstraints === 'function') {
          await this.videoTrack.applyConstraints({
            advanced: [{ zoom: z }]
          });
          appliedHardware = true;
        } else if (this.html5QrCode && typeof this.html5QrCode.applyVideoConstraints === 'function') {
          await this.html5QrCode.applyVideoConstraints({
            advanced: [{ zoom: z }]
          });
          appliedHardware = true;
        }
      } catch (e) {
        appliedHardware = false;
      }

      // Digital CSS Zoom fallback: Áp dụng transform scale mượt mà cho thẻ video
      const reader = document.getElementById(this.readerId);
      if (reader) {
        const video = reader.querySelector('video');
        if (video) {
          if (!appliedHardware || z < 1.0) {
            video.style.transformOrigin = 'center center';
            video.style.transform = `scale(${z})`;
            video.style.transition = 'transform 0.15s ease-out';
          } else {
            video.style.transform = 'none';
          }
        }
      }
    }

    switchCamera() {
      if (!this.cameras || this.cameras.length <= 1) return;
      this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
      const targetCam = this.cameras[this.currentCameraIndex];
      this.updateCamLabel();

      if (typeof this.onCameraChanged === 'function') {
        this.onCameraChanged(targetCam.id, targetCam);
      }
    }

    setCurrentCameraById(deviceId) {
      if (!this.cameras || this.cameras.length === 0) return;
      const idx = this.cameras.findIndex(c => c.id === deviceId);
      if (idx !== -1) {
        this.currentCameraIndex = idx;
        this.updateCamLabel();
      }
    }

    getCameraDisplayName(cam, index) {
      if (!cam) return 'Cam Sau';
      const label = (cam.label || '').toLowerCase();
      // Nhận diện camera phụ góc siêu rộng 0.6x
      if (/wide|ultra|0\.[56]/i.test(label)) {
        return 'Cam 0.6x';
      }
      // Nhận diện camera phụ tele / zoom
      if (/tele|zoom|[2-5]x/i.test(label)) {
        return 'Cam Zoom';
      }
      // Nhận diện camera phụ macro
      if (/macro/i.test(label)) {
        return 'Cam Macro';
      }
      // Nếu có nhiều camera sau/phụ
      if (this.cameras && this.cameras.length > 1) {
        if (index === 0 || /main|chính|0,\s*facing\s*back/i.test(label)) {
          return 'Cam Chính';
        }
        if (this.cameras.length === 2) {
          return 'Cam Phụ';
        }
        return `Cam Phụ ${index}`;
      }
      return 'Cam Sau';
    }

    updateSwitchButtonVisibility() {
      if (!this.overlayEl) return;
      const btnSwitch = this.overlayEl.querySelector('#btnCamSwitch');
      if (btnSwitch) {
        // Chỉ hiển thị nút chuyển camera nếu thực sự có từ 2 camera sau/phụ trở lên
        btnSwitch.style.display = (this.cameras && this.cameras.length > 1) ? 'inline-flex' : 'none';
      }
    }

    async refreshCameras(activeDeviceId = null) {
      try {
        if (typeof Html5Qrcode !== 'undefined' && Html5Qrcode.getCameras) {
          const devices = await Html5Qrcode.getCameras();
          if (Array.isArray(devices) && devices.length > 0) {
            this.cameras = this.filterCameras(devices);

            let targetId = activeDeviceId;
            if (!targetId && this.videoTrack && typeof this.videoTrack.getSettings === 'function') {
              const settings = this.videoTrack.getSettings();
              if (settings && settings.deviceId) {
                targetId = settings.deviceId;
              }
            }
            if (targetId) {
              const idx = this.cameras.findIndex(c => c.id === targetId);
              if (idx !== -1) {
                this.currentCameraIndex = idx;
              }
            } else if (this.videoTrack && this.videoTrack.label) {
              const trackLabel = this.videoTrack.label.toLowerCase();
              const idx = this.cameras.findIndex(c => (c.label || '').toLowerCase() === trackLabel);
              if (idx !== -1) {
                this.currentCameraIndex = idx;
              }
            }
            this.updateSwitchButtonVisibility();
            this.updateCamLabel();
          }
        }
      } catch (e) {
        console.warn('CameraController: Lỗi refresh cameras:', e);
      }
    }

    updateCamLabel() {
      if (!this.overlayEl || !this.cameras || this.cameras.length === 0) return;
      const btnSwitch = this.overlayEl.querySelector('#btnCamSwitch');
      const badge = this.overlayEl.querySelector('#camLabelBadge');
      if (!btnSwitch || !badge) return;

      const currentCam = this.cameras[this.currentCameraIndex];
      const currentName = this.getCameraDisplayName(currentCam, this.currentCameraIndex);

      if (this.cameras.length > 1) {
        const nextIndex = (this.currentCameraIndex + 1) % this.cameras.length;
        const nextCam = this.cameras[nextIndex];
        const nextName = this.getCameraDisplayName(nextCam, nextIndex);

        // Hiển thị camera phụ/chính tiếp theo mà nút sẽ chuyển tới
        badge.textContent = nextName;
        btnSwitch.title = `Đang dùng: ${currentName}. Bấm để chuyển sang: ${nextName}`;
      } else {
        badge.textContent = currentName;
        btnSwitch.title = `Đang dùng: ${currentName}`;
      }
    }

    destroy() {
      if (this.isTorchOn) {
        this.applyTorch(false);
      }
      if (this.overlayEl) {
        this.overlayEl.remove();
        this.overlayEl = null;
      }
      this.videoTrack = null;
    }
  }

  window.CameraController = CameraController;
})(window);
