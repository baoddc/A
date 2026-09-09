# Kế Hoạch Triển Khai Tái Cấu Trúc Giao Diện HSE (hse.html)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tái cấu trúc giao diện và luồng thao tác trang HSE (`pages/5s/hse.html`), bổ sung phân loại danh mục nghiệp vụ và chuyển đổi từ dạng popup modal chật hẹp sang chế độ làm việc toàn màn hình (Workspace Inline View).

**Architecture:** Giữ nguyên các luồng dữ liệu Google Sheets CSV và Google Apps Script API hiện tại. Tái cấu trúc DOM thành hai view: Hub View (tìm kiếm + pill tabs lọc theo 4 nhóm nghiệp vụ + danh sách thẻ) và Workspace View (thanh tiêu đề ngữ cảnh với nút Quay lại, breadcrumb, nút tác vụ nhanh và vùng làm việc toàn màn hình tối ưu cho từng loại dữ liệu).

**Tech Stack:** HTML5, CSS3 (Midnight Neo Glassmorphism, CSS Grid & Flexbox), Vanilla JavaScript (ES6 Modules/Classes), Google Sheets CSV Export, Google Apps Script Web App.

## Global Constraints

- Không làm gián đoạn hay thay đổi cấu trúc dữ liệu kết nối tới Google Spreadsheet ID `1keZMSZqlHFIe7la0H2eR-PDmO2S2ChHo5vn3-H1uoh8` và Apps Script Web App.
- Giữ nguyên cấu trúc logic kiểm tra quyền quản trị tài khoản (`bao.lt`).
- Các tệp nguồn chính: `pages/5s/hse.html`, `assets/css/5s/hse.css`, `assets/js/5s/hse.js`. Sau khi sửa xong, đồng bộ bằng `npm run build`.

---

### Task 1: Cập nhật cấu trúc HTML cho trang HSE (`pages/5s/hse.html`)

**Files:**
- Modify: `pages/5s/hse.html:31-66`

**Interfaces:**
- Consumes: `#hubView`, `#workspaceView`, `.category-tabs`, `#moduleGrid`, `#workspaceTopbar`, `#workspaceBody`
- Produces: Cấu trúc DOM hai vùng làm việc riêng biệt (Hub View & Workspace View) hỗ trợ chuyển đổi view mà không cần reload trang.

- [ ] **Step 1: Thay đổi nội dung thẻ `<main>` trong `pages/5s/hse.html`**

```html
    <main class="dashboard-content">
        <!-- HUB VIEW: Trung tâm điều phối -->
        <div id="hubView" class="view-section active">
            <div class="search-section">
                <h1 class="brand-text">Hệ thống quản lý HSE</h1>
                <p class="brand-subtitle">An Toàn - Vệ Sinh Lao Động & Môi Trường DDC</p>
                <div class="search-bar">
                    <div class="search-input-wrapper">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" id="globalSearch" placeholder="Tìm kiếm chức năng, kế hoạch, hình ảnh, CCDC...">
                    </div>
                </div>

                <!-- Category Filter Tabs -->
                <div class="category-tabs" id="categoryTabs">
                    <button class="tab-pill active" data-category="all">
                        <span>Tất cả</span>
                        <span class="tab-count" id="countAll">11</span>
                    </button>
                    <button class="tab-pill" data-category="plan">
                        <span>📋 Kế hoạch & Lịch</span>
                        <span class="tab-count" id="countPlan">3</span>
                    </button>
                    <button class="tab-pill" data-category="media">
                        <span>📸 Hình ảnh & 5S</span>
                        <span class="tab-count" id="countMedia">3</span>
                    </button>
                    <button class="tab-pill" data-category="tools">
                        <span>🛠️ CCDC & Tiêu chuẩn</span>
                        <span class="tab-count" id="countTools">4</span>
                    </button>
                    <button class="tab-pill" data-category="fix">
                        <span>⚡ Khắc phục 5S</span>
                        <span class="tab-count" id="countFix">1</span>
                    </button>
                </div>
            </div>

            <!-- Grid danh sách 11 phân hệ -->
            <div class="dashboard-grid" id="moduleGrid">
                <div id="loadingOverlay" class="loading-overlay">
                    <div class="spinner"></div>
                    <p>Đang tải dữ liệu HSE...</p>
                </div>
            </div>
        </div>

        <!-- WORKSPACE VIEW: Khu vực thao tác toàn màn hình -->
        <div id="workspaceView" class="view-section" style="display: none;">
            <div class="workspace-topbar">
                <div class="workspace-nav-left">
                    <button class="btn-back-hub" id="btnBackHub" title="Quay lại danh sách chức năng">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span>Quay lại</span>
                    </button>
                    <div class="workspace-title-box">
                        <div class="workspace-breadcrumb" id="workspaceBreadcrumb">HSE / Chức năng</div>
                        <h2 class="workspace-title" id="workspaceTitle">Tiêu đề phân hệ</h2>
                    </div>
                </div>
                <div class="workspace-nav-right" id="workspaceActions">
                    <!-- Action buttons dynamically injected -->
                </div>
            </div>

            <!-- Workspace Body: Nơi chứa bảng dữ liệu, gallery, hoặc tháng -->
            <div class="workspace-body" id="workspaceBody">
                <!-- Nội dung phân hệ được inject ở đây -->
            </div>
        </div>
    </main>
```

- [ ] **Step 2: Kiểm tra cú pháp HTML và commit**

```bash
git add pages/5s/hse.html
git commit -m "feat(hse): add hub and workspace inline view markup in hse.html"
```

---

### Task 2: Nâng cấp CSS giao diện HSE (`assets/css/5s/hse.css`)

**Files:**
- Modify: `assets/css/5s/hse.css`

**Interfaces:**
- Consumes: Cấu trúc lớp giao diện mới (`.category-tabs`, `.tab-pill`, `.workspace-topbar`, `.btn-back-hub`, `.workspace-body`, `.month-segment-bar`)
- Produces: Toàn bộ style cho giao diện Midnight Neo hiện đại, hỗ trợ hiệu ứng chuyển đổi mượt mà giữa Hub View và Workspace View.

- [ ] **Step 1: Bổ sung CSS cho Pill Tabs, Workspace Topbar, Table toàn màn hình và Bộ chọn tháng**

Bổ sung các khối style sau vào `assets/css/5s/hse.css`:
1. `.brand-subtitle` tạo điểm nhấn giao diện dưới tiêu đề.
2. `.category-tabs` thanh cuộn ngang hỗ trợ mobile, các `.tab-pill` bo tròn với hiệu ứng kính mờ và trạng thái `.active` nổi bật với màu emerald green (`--primary`).
3. `.workspace-topbar` cố định hoặc nổi bật phía trên, nền glassmorphism, chia 2 bên (nút Quay lại + breadcrumb + tiêu đề; bên phải là các nút tác vụ upload ảnh, upload pdf).
4. `.workspace-body` độ rộng tối đa 1400px hoặc 100%, đệm padding chuẩn, thanh cuộn bảng không bị bó hẹp.
5. `.table-responsive` với sticky header `thead th` và hiệu ứng hover dòng bảng.
6. Cải tiến giao diện lưới thẻ tháng (`.month-grid` và `.month-card`).

- [ ] **Step 2: Kiểm tra tính toàn vẹn CSS và commit**

```bash
git add assets/css/5s/hse.css
git commit -m "style(hse): add styles for category tabs, workspace layout, and modern tables"
```

---

### Task 3: Tái cấu trúc logic hiển thị & Điều hướng trong `assets/js/5s/hse.js`

**Files:**
- Modify: `assets/js/5s/hse.js`

**Interfaces:**
- Consumes: `HSE_MODULES`, `GSheetsService`, `CONFIG`
- Produces: `DashboardManager.switchView()`, `openWorkspace()`, lọc theo category, render inline tháng và bảng tính, bảo lưu 100% logic upload/delete ảnh và PDF.

- [ ] **Step 1: Thêm thuộc tính `category` vào từng module trong `HSE_MODULES`**
  - `job-plan`: `category: 'plan'`
  - `wh-photos`: `category: 'media'`
  - `clean-schedule`: `category: 'plan'`
  - `clean-photos`: `category: 'media'`
  - `equipment-checklist`: `category: 'plan'`
  - `tools-inventory`: `category: 'tools'`
  - `disposal-standards`: `category: 'tools'`
  - `scrap-categories`: `category: 'tools'`
  - `scrap-regs`: `category: 'tools'`
  - `5s-fix`: `category: 'fix'`
  - `5s-race`: `category: 'media'`

- [ ] **Step 2: Bổ sung các biến DOM và phương thức điều hướng View trong `DashboardManager`**
  - Khởi tạo: `this.hubView`, `this.workspaceView`, `this.workspaceTitle`, `this.workspaceBreadcrumb`, `this.workspaceActions`, `this.workspaceBody`, `this.btnBackHub`, `this.categoryTabs`.
  - Phương thức `switchView(viewName)`: chuyển đổi hiển thị giữa `'hub'` và `'workspace'`.
  - Cập nhật sự kiện click cho các tab lọc danh mục (`all`, `plan`, `media`, `tools`, `fix`).
  - Gán sự kiện cho `btnBackHub` quay lại Hub View.

- [ ] **Step 3: Cập nhật hàm `openDetail(moduleId)` thành `openWorkspace(moduleId)`**
  - Khi click thẻ: Gọi `openWorkspace(moduleId)`.
  - Cập nhật tiêu đề, breadcrumb và reset vùng hiển thị `workspaceBody`.
  - Tải dữ liệu qua `GSheetsService.fetchSheetData`.
  - Render nội dung tương ứng trực tiếp vào `workspaceBody` thay vì popup modal.
  - Inject các nút hành động (Upload ảnh, Upload PDF) vào `workspaceActions` trên topbar của Workspace để tiện thao tác nhanh.

- [ ] **Step 4: Nâng cấp `renderModuleByMonthGroups` và `renderTable`**
  - Hiển thị danh sách tháng trực quan, có thống kê số lượng đầu việc.
  - Bảng tính có sticky header và ô tìm kiếm nội bộ để tra cứu nhanh ngay trong bảng.

- [ ] **Step 5: Kiểm tra mã nguồn JS và commit**

```bash
git add assets/js/5s/hse.js
git commit -m "feat(hse): implement inline workspace view, category filtering, and enhanced navigation"
```

---

### Task 4: Đồng bộ bản build và Kiểm thử giao diện

**Files:**
- Modify: Tự động qua `npm run build` (`public/`, `dist/`)

- [ ] **Step 1: Chạy build để đồng bộ mã nguồn sang `public/` và `dist/`**

```bash
npm run build
```

- [ ] **Step 2: Kiểm thử hiển thị trên trình duyệt**
  - Kiểm tra bộ lọc danh mục (Tabs Tất cả / Kế hoạch / Hình ảnh / CCDC / Khắc phục).
  - Kiểm tra tìm kiếm toàn cục.
  - Bấm vào một thẻ phân hệ (ví dụ: Kế hoạch công việc) -> Xem chuyển sang Workspace View toàn màn hình.
  - Bấm `Quay lại` -> Trở về Hub View mượt mà.
  - Kiểm tra mở phân hệ ảnh (Ảnh vệ sinh) -> Kiểm tra nút Tải ảnh và xem phóng to Lightbox.
  - Kiểm tra phân hệ Khắc phục 5S -> Kiểm tra bảng hiển thị ảnh Trước/Sau.

- [ ] **Step 3: Commit hoàn thiện**

```bash
git add .
git commit -m "build: sync updated hse files to dist and public"
```
