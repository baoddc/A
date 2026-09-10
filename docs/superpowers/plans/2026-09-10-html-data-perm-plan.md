# HTML Page Data-Perm & User Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cập nhật phân quyền toàn diện: bổ sung nhóm "TEM QR, KIỂM KÊ" vào `quan-ly-user.html` và gắn thuộc tính khai báo `data-perm` lên các file HTML nghiệp vụ để tự động ẩn/hiện nút Thêm, Sửa, Xóa theo quyền của người dùng.

**Architecture:** Sử dụng thuộc tính chuẩn hóa `data-perm` (`add`, `edit`, `delete`) trên các nút HTML kết hợp với Core Permission Enforcer trong `assets/js/core/supabase-config.js` tự động nhận diện nhóm nghiệp vụ theo URL và ẩn các phần tử không có quyền; đồng thời bổ sung nhóm `tem_qr` vào giao diện và logic phân quyền của `quan-ly-user.html`/`quan-ly-user.js`.

**Tech Stack:** Vanilla JavaScript, HTML5, Bootstrap 5, Supabase JS, Node.js (test runner, sync scripts).

## Global Constraints

- Không làm gián đoạn tài khoản Admin `bao.lt` (luôn có toàn quyền trên toàn hệ thống).
- Đảm bảo tương thích ngược với cấu trúc JSONB `allowed_pages` hiện tại trong DB.
- Tự động đồng bộ các file nguồn sang `public/`, `dist/`, `dist-app/` bằng `scripts/sync-dist.js`.
- Tất cả các test suites (`tests/page-permissions.test.js`, `tests/auth-redirect.test.js`, `tests/sidebar-visibility.test.js`, `tests/html-data-perm.test.js`) phải PASS 100%.

---

### Task 1: Core Permission Enforcer trong `assets/js/core/supabase-config.js`

**Files:**
- Modify: `assets/js/core/supabase-config.js:110-180`
- Test: `tests/html-data-perm.test.js`

**Interfaces:**
- Consumes: `getUserPermissions(groupName)`
- Produces: `window.applyElementPermissions(targetGroup)`, auto-runs on DOMContentLoaded

- [ ] **Step 1: Viết test kiểm tra `applyElementPermissions` trong `tests/html-data-perm.test.js`**

```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Running HTML Data-Perm & Enforcer Tests ---');

// Mock DOM and localStorage to test applyElementPermissions
function createTestEnv(pathname, user, groupPerms) {
  const elements = [
    { id: 'btnAdd', dataset: { perm: 'add' }, style: {}, classList: { add: (c) => elements[0].classes.push(c), remove: () => {} }, classes: [] },
    { id: 'btnEdit', dataset: { perm: 'edit' }, style: {}, classList: { add: (c) => elements[1].classes.push(c), remove: () => {} }, classes: [] },
    { id: 'btnDelete', dataset: { perm: 'delete' }, style: {}, classList: { add: (c) => elements[2].classes.push(c), remove: () => {} }, classes: [] }
  ];

  const sandbox = {
    window: {
      location: { pathname },
      addEventListener: (evt, fn) => { if (evt === 'DOMContentLoaded') fn(); },
      currentUser: user
    },
    document: {
      querySelectorAll: (sel) => {
        if (sel === '[data-perm]') return elements;
        return [];
      },
      addEventListener: (evt, fn) => { if (evt === 'DOMContentLoaded') fn(); }
    },
    localStorage: {
      _d: {
        currentUser: user,
        userGroupPermissions: JSON.stringify(groupPerms || {})
      },
      getItem(k) { return this._d[k] || null; },
      setItem(k, v) { this._d[k] = String(v); }
    },
    console: { log: () => {}, warn: () => {}, error: () => {} }
  };
  sandbox.window.top = sandbox.window;
  return { sandbox, elements };
}

// Test case 1: Non-admin user with only view permission in XG
// Elements with data-perm="add", "edit", "delete" must be hidden
```

- [ ] **Step 2: Chạy test để xác nhận test ban đầu fail**

Run: `node tests/html-data-perm.test.js`
Expected: FAIL (applyElementPermissions chưa được định nghĩa)

- [ ] **Step 3: Triển khai hàm `applyElementPermissions` trong `assets/js/core/supabase-config.js`**

Triển khai logic:
1. Xác định nhóm nghiệp vụ từ URL:
   - `/pages/xg/` -> `xg`
   - `/pages/tole/` -> `tole`
   - `/pages/pl/` -> `pl`
   - `/pages/5s/` -> `5s`
   - `/pages/tem-nhan-kiem-ke/` -> `tem_qr`
   - `/pages/cong-viec.html` -> `chung`
2. Lấy quyền: `const perms = getUserPermissions(group);`
3. Quét `document.querySelectorAll('[data-perm]')`:
   - Nếu `perm === 'add'` && `!perms.canAdd` -> ẩn phần tử (`el.style.display = 'none'`, `el.setAttribute('data-perm-hidden', 'true')`)
   - Nếu `perm === 'edit'` && `!perms.canEdit` -> ẩn phần tử
   - Nếu `perm === 'delete'` && `!perms.canDelete` -> ẩn phần tử
4. Tự động kích hoạt khi `DOMContentLoaded` và export ra `window.applyElementPermissions`.

- [ ] **Step 4: Chạy lại test `tests/html-data-perm.test.js`**

Run: `node tests/html-data-perm.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add assets/js/core/supabase-config.js tests/html-data-perm.test.js
git commit -m "feat(auth): implement core applyElementPermissions for data-perm attributes"
```

---

### Task 2: Cập nhật giao diện & logic phân quyền trong `pages/quan-ly-user.html` và `assets/js/quan-ly-user.js`

**Files:**
- Modify: `pages/quan-ly-user.html:179-295`
- Modify: `assets/js/quan-ly-user.js:280-340, 360-450`

**Interfaces:**
- Consumes: Supabase `admin_save_user` RPC
- Produces: Nhóm `tem_qr` trong `allowed_pages.groups`, các trang `/pages/tem-nhan-kiem-ke/*.html` trong `allowed_pages.pages`

- [ ] **Step 1: Thêm nhóm "TEM QR, KIỂM KÊ" vào accordion trong `pages/quan-ly-user.html`**

Thêm block HTML hoàn chỉnh cho `tem_qr`:
```html
<!-- Nhóm TEM QR, KIỂM KÊ -->
<div class="mb-2 p-2 rounded border border-secondary bg-opacity-10 bg-secondary">
    <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="fw-bold text-light small"><i class="fa-solid fa-qrcode text-info me-1"></i>Nhóm TEM QR, KIỂM KÊ</span>
        <input type="checkbox" class="form-check-input group-select-all" data-group="tem_qr" title="Chọn toàn bộ nhóm">
    </div>
    <div class="row g-1 ps-2 mb-2 pb-1 border-bottom border-secondary border-opacity-50">
        <div class="col-3"><div class="form-check small"><input class="form-check-input group-perm-action group-perm-tem_qr" type="checkbox" data-group="tem_qr" data-action="view" id="perm_tem_qr_view"><label class="form-check-label text-muted" for="perm_tem_qr_view">👁️ Xem</label></div></div>
        <div class="col-3"><div class="form-check small"><input class="form-check-input group-perm-action group-perm-tem_qr" type="checkbox" data-group="tem_qr" data-action="add" id="perm_tem_qr_add"><label class="form-check-label text-muted" for="perm_tem_qr_add">➕ Thêm</label></div></div>
        <div class="col-3"><div class="form-check small"><input class="form-check-input group-perm-action group-perm-tem_qr" type="checkbox" data-group="tem_qr" data-action="edit" id="perm_tem_qr_edit"><label class="form-check-label text-muted" for="perm_tem_qr_edit">✏️ Sửa</label></div></div>
        <div class="col-3"><div class="form-check small"><input class="form-check-input group-perm-action group-perm-tem_qr" type="checkbox" data-group="tem_qr" data-action="delete" id="perm_tem_qr_delete"><label class="form-check-label text-muted" for="perm_tem_qr_delete">🗑️ Xóa</label></div></div>
    </div>
    <div class="row g-1 ps-2">
        <div class="col-12"><div class="form-check small"><input class="form-check-input page-checkbox group-page-tem_qr" type="checkbox" value="/pages/tem-nhan-kiem-ke/in-tem-vitri.html" id="p_tem_in_vitri"><label class="form-check-label text-muted" for="p_tem_in_vitri">In tem QR Vị trí Kệ</label></div></div>
        <div class="col-12"><div class="form-check small"><input class="form-check-input page-checkbox group-page-tem_qr" type="checkbox" value="/pages/tem-nhan-kiem-ke/vi-tri-ton.html" id="p_tem_vitri_ton"><label class="form-check-label text-muted" for="p_tem_vitri_ton">Tra cứu Tồn theo Kệ</label></div></div>
        <div class="col-12"><div class="form-check small"><input class="form-check-input page-checkbox group-page-tem_qr" type="checkbox" value="/pages/tem-nhan-kiem-ke/kiem-ke.html" id="p_tem_kiem_ke"><label class="form-check-label text-muted" for="p_tem_kiem_ke">Kiểm kê Tồn kho</label></div></div>
    </div>
</div>
```

- [ ] **Step 2: Cập nhật `assets/js/quan-ly-user.js`**

1. Mở rộng `groupNames`:
   `const groupNames = ['chung', '5s', 'xg', 'tole', 'pl', 'tem_qr', 'admin'];`
2. Cập nhật `fallback groupsObj`:
   Thêm `'tem_qr'` vào danh sách khởi tạo mặc định.
3. Cập nhật `computePermissionDiff`:
   Thêm `'tem_qr': 'TEM QR, KIỂM KÊ'` vào `groupLabels`.
4. Cập nhật `handleSaveUser`:
   Thu thập các quyền thao tác của nhóm `tem_qr` vào payload `groups.tem_qr`.

- [ ] **Step 3: Kiểm tra cú pháp và logic**

Run: `node -c assets/js/quan-ly-user.js`
Expected: Cú pháp hợp lệ, không lỗi.

- [ ] **Step 4: Commit**

```bash
git add pages/quan-ly-user.html assets/js/quan-ly-user.js
git commit -m "feat(user-mgmt): add TEM QR, KIEM KE group to permission accordion"
```

---

### Task 3: Gắn thuộc tính `data-perm` vào các file `.html` nghiệp vụ

**Files:**
- Modify: `pages/xg/xg-nhap.html`, `pages/xg/xg-xuat.html`, `pages/xg/xg-ton.html`
- Modify: `pages/tole/tole-nhap.html`, `pages/tole/tole-xuat.html`, `pages/tole/tole-ton.html`
- Modify: `pages/pl/pl-can-thu.html`, `pages/pl/pl-da-thu.html`, `pages/pl/pl-chua-thu.html`, `pages/pl/pl-phieu-in.html`
- Modify: `pages/tem-nhan-kiem-ke/kiem-ke.html`, `pages/tem-nhan-kiem-ke/in-tem-vitri.html`, `pages/tem-nhan-kiem-ke/vi-tri-ton.html`

- [ ] **Step 1: Gắn `data-perm` trong nhóm XÀ GỒ (`pages/xg/*.html`)**
  - `xg-nhap.html`: `btnAddData` (`data-perm="add"`), `btnEditData` (`data-perm="edit"`), `btnDeleteData` (`data-perm="delete"`).
  - `xg-xuat.html`: `btnAddData` (`data-perm="add"`), `btnEditData` (`data-perm="edit"`), `btnDeleteData` (`data-perm="delete"`).
  - `xg-ton.html`: kiểm tra các nút thao tác.

- [ ] **Step 2: Gắn `data-perm` trong nhóm TOLE (`pages/tole/*.html`)**
  - `tole-nhap.html`: `btnAddData` (`data-perm="add"`), `btnEditData` (`data-perm="edit"`), `btnDeleteData` (`data-perm="delete"`).
  - `tole-xuat.html`: `btnAddData` (`data-perm="add"`), `btnEditData` (`data-perm="edit"`), `btnDeleteData` (`data-perm="delete"`).

- [ ] **Step 3: Gắn `data-perm` trong nhóm PHẾ LIỆU (`pages/pl/*.html`)**
  - `pl-can-thu.html`: Các nút thêm/sửa/xóa phiếu.
  - `pl-da-thu.html`: Các nút sửa/xóa phiếu.
  - `pl-chua-thu.html`: Các nút cập nhật.
  - `pl-phieu-in.html`: Nút tạo phiếu mới (`data-perm="add"`), nút xóa phiếu (`data-perm="delete"`).

- [ ] **Step 4: Gắn `data-perm` trong nhóm TEM QR, KIỂM KÊ (`pages/tem-nhan-kiem-ke/*.html`)**
  - `kiem-ke.html`: Nút/nhãn nạp file Excel cơ sở (`data-perm="add"`), nút camera quét liên tục (`data-perm="add"`), nút làm lại/xóa phiên (`data-perm="delete"`).
  - `in-tem-vitri.html`: Nút in danh sách tem (`data-perm="add"`), nút tải ảnh zip (`data-perm="add"`).
  - `vi-tri-ton.html`: Nút gán vị trí / cập nhật dữ liệu (`data-perm="edit"`).

- [ ] **Step 5: Bổ sung kiểm tra trong `tests/html-data-perm.test.js` để xác nhận tất cả file HTML đều đã gắn `data-perm` đúng**

Run: `node tests/html-data-perm.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add pages/
git commit -m "feat(ui): add data-perm attributes to action buttons across html pages"
```

---

### Task 4: Đồng bộ bản Build & Chạy toàn bộ Test Suite

**Files:**
- Execute: `scripts/sync-dist.js`
- Test: `tests/page-permissions.test.js`, `tests/auth-redirect.test.js`, `tests/sidebar-visibility.test.js`, `tests/html-data-perm.test.js`

- [ ] **Step 1: Chạy build đồng bộ sang `dist/`, `public/`, `dist-app/`**

Run: `npm run build`
Expected: `[Sync Script] Full synchronization completed successfully!`

- [ ] **Step 2: Chạy toàn bộ test suite**

Run:
```bash
node tests/page-permissions.test.js
node tests/auth-redirect.test.js
node tests/sidebar-visibility.test.js
node tests/html-data-perm.test.js
```
Expected: Tất cả 4 test suite đều in `PASS` và exit code 0.

- [ ] **Step 3: Commit bản build hoàn tất**

```bash
git add .
git commit -m "chore: sync distribution files and verify all permission test suites"
```
