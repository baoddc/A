# Design Document: Cập nhật Phân quyền Toàn diện trên các File HTML & Giao diện Quản lý Người dùng

**Ngày tạo**: 2026-09-10  
**Tác giả**: AI Assistant & bao.lt  
**Trạng thái**: Đã phê duyệt (Approved)  

---

## 1. Mục tiêu & Tổng quan

Nâng cấp và chuẩn hóa toàn bộ hệ thống phân quyền của ứng dụng:
1. **Bổ sung nhóm "TEM QR, KIỂM KÊ" (`tem_qr`)** vào giao diện Phân quyền & Quản lý Người dùng (`pages/quan-ly-user.html`), cho phép Admin `bao.lt` cấu hình chi tiết 4 quyền thao tác (Xem, Thêm, Sửa, Xóa) và quyền truy cập từng trang HTML thuộc nhóm này.
2. **Chuẩn hóa phân quyền khai báo trực tiếp trên các file `.html`** bằng thuộc tính `data-perm` (`add`, `edit`, `delete`) trên tất cả các nút hành động (Thêm, Sửa, Xóa, Nạp dữ liệu, Reset phiên, v.v.).
3. **Xây dựng Bộ thực thi phân quyền cốt lõi (Core Permission Enforcer)** trong `supabase-config.js` / `sidebar.js`, tự động nhận diện nhóm nghiệp vụ theo URL hiện tại, quét các phần tử `[data-perm]` và ẩn hoặc vô hiệu hóa các thao tác người dùng không được phép.
4. **Đồng bộ hóa bản build** sang các thư mục phân phối `public/`, `dist/`, `dist-app/` bằng `scripts/sync-dist.js`.

---

## 2. Thiết kế Chi tiết & Cấu trúc Dữ liệu

### 2.1 Cập nhật `pages/quan-ly-user.html` & `assets/js/quan-ly-user.js`

#### 2.1.1 Bổ sung nhóm "TEM QR, KIỂM KÊ" trong Accordion phân quyền
Thêm cụm nhóm với mã nhận diện `tem_qr` vào `#pagePermAccordion`:
- **Header nhóm**: Tên nhóm "TEM QR, KIỂM KÊ" + Checkbox chọn toàn bộ nhóm (`group-select-all[data-group="tem_qr"]`).
- **Hàng quyền thao tác**:
  - `👁️ Xem`: `id="perm_tem_qr_view"` (`class="group-perm-action group-perm-tem_qr"`, `data-group="tem_qr"`, `data-action="view"`)
  - `➕ Thêm`: `id="perm_tem_qr_add"` (`class="group-perm-action group-perm-tem_qr"`, `data-group="tem_qr"`, `data-action="add"`)
  - `✏️ Sửa`: `id="perm_tem_qr_edit"` (`class="group-perm-action group-perm-tem_qr"`, `data-group="tem_qr"`, `data-action="edit"`)
  - `🗑️ Xóa`: `id="perm_tem_qr_delete"` (`class="group-perm-action group-perm-tem_qr"`, `data-group="tem_qr"`, `data-action="delete"`)
- **Danh sách trang HTML**:
  - `In tem QR Vị trí Kệ`: value `/pages/tem-nhan-kiem-ke/in-tem-vitri.html` (`id="p_tem_in_vitri"`)
  - `Tra cứu Tồn theo Kệ`: value `/pages/tem-nhan-kiem-ke/vi-tri-ton.html` (`id="p_tem_vitri_ton"`)
  - `Kiểm kê Tồn kho`: value `/pages/tem-nhan-kiem-ke/kiem-ke.html` (`id="p_tem_kiem_ke"`)

#### 2.1.2 Cấu trúc JSONB lưu trữ `allowed_pages` trên Supabase
Mở rộng danh sách nhóm trong trường `allowed_pages.groups`:
```json
{
  "pages": [
    "/pages/trang-chu/home.html",
    "/pages/xg/xg-nhap.html",
    "/pages/tem-nhan-kiem-ke/kiem-ke.html"
  ],
  "groups": {
    "chung": { "canView": true, "canAdd": false, "canEdit": false, "canDelete": false },
    "5s": { "canView": true, "canAdd": false, "canEdit": false, "canDelete": false },
    "xg": { "canView": true, "canAdd": true, "canEdit": true, "canDelete": false },
    "tole": { "canView": true, "canAdd": false, "canEdit": false, "canDelete": false },
    "pl": { "canView": true, "canAdd": true, "canEdit": true, "canDelete": false },
    "tem_qr": { "canView": true, "canAdd": true, "canEdit": true, "canDelete": false },
    "admin": { "canView": false, "canAdd": false, "canEdit": false, "canDelete": false }
  }
}
```

#### 2.1.3 Đồng bộ logic trong `assets/js/quan-ly-user.js`
- Bổ sung `'tem_qr'` vào mảng `groupNames`:
  `const groupNames = ['chung', '5s', 'xg', 'tole', 'pl', 'tem_qr', 'admin'];`
- Cập nhật hàm `computePermissionDiff`: Bổ sung nhãn `tem_qr: 'TEM QR, KIỂM KÊ'` để hiển thị chính xác thông báo thay đổi quyền khi Admin lưu tài khoản.

---

### 2.2 Thuộc tính `data-perm` trên các File `.html` Nghiệp vụ

Gắn thuộc tính khai báo trực tiếp lên các nút thao tác:

#### 1. Nhóm XÀ GỒ (`pages/xg/`)
- `xg-nhap.html`:
  - `#btnAddData`: `data-perm="add"`
  - `#btnEditData`: `data-perm="edit"`
  - `#btnDeleteData`: `data-perm="delete"`
- `xg-xuat.html`:
  - `#btnAddData`: `data-perm="add"`
  - `#btnEditData`: `data-perm="edit"`
  - `#btnDeleteData`: `data-perm="delete"`
- `xg-ton.html`:
  - `#btnExportExcel` (nếu kiểm soát xuất): giữ nguyên hoặc gắn quyền tương ứng.

#### 2. Nhóm TOLE (`pages/tole/`)
- `tole-nhap.html`:
  - `#btnAddData`: `data-perm="add"`
  - `#btnEditData`: `data-perm="edit"`
  - `#btnDeleteData`: `data-perm="delete"`
- `tole-xuat.html`:
  - `#btnAddData`: `data-perm="add"`
  - `#btnEditData`: `data-perm="edit"`
  - `#btnDeleteData`: `data-perm="delete"`

#### 3. Nhóm PHẾ LIỆU (`pages/pl/`)
- `pl-can-thu.html`:
  - Nút thêm / tạo phiếu / xóa: gắn `data-perm="add"`, `data-perm="edit"`, `data-perm="delete"`.
- `pl-da-thu.html`:
  - Nút sửa / xóa / cập nhật: gắn `data-perm="edit"`, `data-perm="delete"`.
- `pl-chua-thu.html`:
  - Nút cập nhật trạng thái thu: gắn `data-perm="edit"`.
- `pl-phieu-in.html`:
  - Nút lập phiếu xuất bán / xuất trả: gắn `data-perm="add"`.
  - Nút xóa phiếu: gắn `data-perm="delete"`.

#### 4. Nhóm TEM QR, KIỂM KÊ (`pages/tem-nhan-kiem-ke/`)
- `kiem-ke.html`:
  - Label nạp file Excel `#excelFileInput`: `data-perm="add"`
  - Nút camera quét liên tục `#btnOpenScannerCamera`: `data-perm="add"`
  - Nút xóa phiên làm lại `#btnResetSession`: `data-perm="delete"`
- `in-tem-vitri.html`:
  - Nút in tem `#btnPrint`: `data-perm="add"`
  - Nút xuất file ZIP `#btnExportZip`: `data-perm="add"`
- `vi-tri-ton.html`:
  - Các nút gán vị trí cuộn / cập nhật: `data-perm="edit"`

---

### 2.3 Bộ Thực Thi Tự Động (Core Permission Enforcer)

Triển khai hàm `applyElementPermissions(targetGroup)` trong `assets/js/core/supabase-config.js`:
1. **Xác định nhóm từ URL hiện tại**:
   - `/pages/xg/` -> `xg`
   - `/pages/tole/` -> `tole`
   - `/pages/pl/` -> `pl`
   - `/pages/5s/` -> `5s`
   - `/pages/tem-nhan-kiem-ke/` -> `tem_qr`
   - `/pages/cong-viec.html` -> `chung`
2. **Đọc quyền người dùng**:
   - Gọi `getUserPermissions(detectedGroup)`.
   - Nếu là Admin `bao.lt`: Giữ nguyên tất cả các nút, không ẩn gì.
3. **Thực thi ẩn/hiện**:
   - Tìm tất cả `[data-perm]` trong DOM:
     - `data-perm="add"`: Nếu `!perms.canAdd` -> `el.style.display = 'none'` (hoặc `el.classList.add('d-none-perm')`).
     - `data-perm="edit"`: Nếu `!perms.canEdit` -> ẩn element.
     - `data-perm="delete"`: Nếu `!perms.canDelete` -> ẩn element.
4. **Tự động chạy**:
   - Chạy khi DOMContentLoaded.
   - Lắng nghe sự kiện `storage` và gọi lại khi quyền thay đổi.

---

## 3. Kế hoạch Kiểm thử & Xác minh

### 3.1 Kiểm thử Tự động
- Chạy test suites hiện có:
  - `node tests/page-permissions.test.js`
  - `node tests/auth-redirect.test.js`
  - `node tests/sidebar-visibility.test.js`
- Viết test mới `tests/html-data-perm.test.js`:
  - Kiểm tra xem các file `.html` chỉ định đã chứa các thuộc tính `data-perm` chuẩn xác chưa.
  - Kiểm tra hàm `applyElementPermissions` trong môi trường giả lập DOM (JSDOM/vm) với các kịch bản:
    * User có `canAdd: false` -> Nút `data-perm="add"` bị ẩn.
    * User có `canDelete: false` -> Nút `data-perm="delete"` bị ẩn.
    * User `bao.lt` (Admin) -> Toàn bộ nút hiển thị bình thường.

### 3.2 Kiểm thử Thủ công
1. Đăng nhập tài khoản `bao.lt`:
   - Mở `quan-ly-user.html`, thấy xuất hiện nhóm "TEM QR, KIỂM KÊ" với 3 trang con và 4 quyền Xem/Thêm/Sửa/Xóa.
   - Thử sửa user test: Bỏ chọn quyền "Xóa" của nhóm XÀ GỒ và bỏ chọn "Thêm" của nhóm TEM QR, KIỂM KÊ. Lưu lại.
2. Đăng nhập user test:
   - Mở `pages/xg/xg-nhap.html`: Nút "Xóa dữ liệu" bị ẩn khỏi giao diện.
   - Mở `pages/tem-nhan-kiem-ke/kiem-ke.html`: Nút nạp file / quét tạo mới bị ẩn.
3. Chạy `npm run build` để đồng bộ toàn bộ file sang `dist/`, `public/`, `dist-app/`.
