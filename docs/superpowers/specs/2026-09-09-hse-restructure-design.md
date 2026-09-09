# Thiết Kế Tái Cấu Trúc Giao Diện & Thao Tác Hệ Thống Quản Lý HSE (hse.html)

**Ngày lập:** 2026-09-09  
**Mục tiêu:** Chuyển đổi giao diện HSE từ dạng pop-up modal chật hẹp thành giao diện phân nhóm danh mục kết hợp chế độ làm việc toàn màn hình (Inline Workspace View), giúp thao tác quản lý dữ liệu, ảnh, bảng tính và tài liệu dễ dàng, trực quan.

---

## 1. Bối cảnh & Vấn đề hiện tại
- File [hse.html](file:///c:/Users/benhhc/Desktop/web-supabase/pages/5s/hse.html) hiện hiển thị 11 phân hệ trên một lưới phẳng (flat grid).
- Mọi thao tác (xem kế hoạch theo tháng, xem gallery ảnh, duyệt bảng khắc phục 5S, xem/tải tài liệu PDF) đều bị gói gọn trong một cửa sổ bật lên (`#detailModal`), gây cảm giác chật hẹp, khó cuộn dữ liệu lớn và phải mở/đóng liên tục.
- Chưa có phân loại danh mục nghiệp vụ khiến người dùng khó định vị nhanh chức năng mong muốn.

---

## 2. Kiến trúc thông tin & Phân nhóm danh mục
11 phân hệ được tổ chức thành 4 nhóm nghiệp vụ chính:

| Nhóm nghiệp vụ | Mã phân hệ (ID) | Tên phân hệ | Loại nội dung chính |
|---|---|---|---|
| **📋 Kế hoạch & Lịch biểu** | `job-plan`<br>`clean-schedule`<br>`equipment-checklist` | Kế hoạch công việc<br>Lịch vệ sinh<br>Checklist kiểm tra thiết bị | Nhóm theo Tháng, bảng dữ liệu tiến độ, trạng thái hạn định |
| **📸 Hình ảnh & Hiện trường** | `wh-photos`<br>`clean-photos`<br>`5s-race` | Ảnh mẫu kho<br>Ảnh vệ sinh<br>Thi đua 5S | Lưới hình ảnh theo ngày, phóng to Lightbox, tải ảnh lên Drive |
| **🛠️ Công cụ & Tiêu chuẩn** | `tools-inventory`<br>`disposal-standards`<br>`scrap-categories`<br>`scrap-regs` | Công cụ dụng cụ (CCDC)<br>Tiêu chuẩn loại bỏ CCDC<br>Danh mục phân loại phế liệu<br>Quy định phế liệu (PDF) | Bảng tra cứu thông số tồn kho, quy chuẩn, tài liệu PDF đính kèm |
| **⚡ Khắc phục & Cải tiến** | `5s-fix` | Khắc phục 5S | Bảng theo dõi điểm không phù hợp, hình ảnh Trước / Sau trực tiếp |

---

## 3. Kiến trúc giao diện & Luồng trải nghiệm (UX Flow)

### 3.1. Màn hình Trung tâm điều hành (Hub View)
- **Thanh tìm kiếm toàn cục (Global Search)**: Tìm kiếm nhanh theo tên chức năng, mô tả hoặc từ khóa liên quan.
- **Bộ lọc danh mục dạng Pill Tabs**:
  - `Tất cả` (hiển thị toàn bộ 11 phân hệ kèm số lượng)
  - `Kế hoạch & Lịch`
  - `Hình ảnh hiện trường`
  - `CCDC & Tiêu chuẩn`
  - `Khắc phục 5S`
- **Lưới thẻ phân hệ (Module Grid)**: Thiết kế Midnight Neo cao cấp với hiệu ứng kính mờ (Glassmorphism), viền gradient khi hover, badge trạng thái và nút "Truy cập".

### 3.2. Màn hình Không gian làm việc (Workspace Inline View)
- Khi bấm vào bất kỳ phân hệ nào:
  - Màn hình Hub trượt ẩn mượt mà (`display: none` / animation fade out).
  - Không gian làm việc `Workspace View` mở rộng 100% chiều rộng khung nội dung.
- **Thanh tiêu đề Workspace (Workspace Topbar)**:
  - Nút quay lại: `← Quay lại danh sách chức năng`.
  - Breadcrumb định vị: `HSE > [Tên nhóm] > [Tên phân hệ]`.
  - Nút tác vụ nhanh theo ngữ cảnh:
    - Nếu là Gallery ảnh: Nút `+ Tải ảnh mới`.
    - Nếu là Quy định phế liệu: Nút `+ Tải lên tài liệu PDF`.
- **Khu vực hiển thị dữ liệu chính (Workspace Body)**:
  - **Dạng Kế hoạch / Lịch biểu**: Thanh chọn tháng dạng thẻ tab ngang; bảng dữ liệu toàn màn hình với sticky header và phân màu trạng thái (Hoàn thành - xanh, Đang làm - vàng, Quá hạn - đỏ).
  - **Dạng Gallery**: Lưới ảnh tự động co giãn theo độ phân giải màn hình, gom nhóm theo Ngày chụp, tích hợp nút xóa và xem phóng to Lightbox.
  - **Dạng Bảng khắc phục 5S**: Bảng rộng rãi hiển thị thumbnail ảnh trước/sau kèm nút tải ảnh/xóa ảnh trực tiếp trong từng dòng dữ liệu.
  - **Dạng Tài liệu PDF**: Thẻ danh mục tài liệu chuyên nghiệp kèm nút đọc trực tiếp PDF toàn màn hình (PDF Viewer Lightbox) và nút tải về.

---

## 4. Chi tiết kỹ thuật & Tương thích hệ thống
- **Giữ nguyên toàn bộ logic kết nối**:
  - GSheetsService: Đọc CSV từ Google Spreadsheet ID qua `sheetId`.
  - Apps Script HSE API: `uploadImageRow`, `deleteImageRow`, `updateImageCell`, `deleteImageCell` giữ nguyên 100% cấu trúc payload.
  - Phân quyền tài khoản quản trị `bao.lt` và thông báo không có quyền truy cập.
- **Cấu trúc tệp thay đổi**:
  - [pages/5s/hse.html](file:///c:/Users/benhhc/Desktop/web-supabase/pages/5s/hse.html): Thêm container `#workspaceView` song song với `#hubView`, bổ sung bộ lọc Pill Tabs. Đồng bộ sang `public/pages/5s/hse.html` nếu cần.
  - [assets/css/5s/hse.css](file:///c:/Users/benhhc/Desktop/web-supabase/assets/css/5s/hse.css): Thêm style cho Pill Tabs, Workspace Topbar, sticky header table, bộ chọn tháng dạng ngang và hiệu ứng chuyển view mượt mà.
  - [assets/js/5s/hse.js](file:///c:/Users/benhhc/Desktop/web-supabase/assets/js/5s/hse.js): Bổ sung `category` vào `HSE_MODULES`, triển khai phương thức `switchView('hub' | 'workspace')`, điều hướng `openDetail` sang Workspace View thay vì hiển thị modal popup.

---

## 5. Kế hoạch xác thực (Verification Plan)
- Kiểm tra hiển thị bộ lọc Pill Tabs và tìm kiếm trên Hub View.
- Kiểm tra chuyển đổi mượt mà giữa Hub View và Workspace View khi bấm vào thẻ và khi bấm `← Quay lại`.
- Kiểm tra chức năng từng loại màn hình trong Workspace View:
  - Chọn tháng và bảng dữ liệu Kế hoạch công việc.
  - Gallery ảnh vệ sinh và ảnh mẫu kho.
  - Bảng Khắc phục 5S với ảnh Before/After.
  - Danh sách và trình đọc tài liệu PDF.
- Đảm bảo tương thích responsive trên cả Desktop và Màn hình nhỏ.
