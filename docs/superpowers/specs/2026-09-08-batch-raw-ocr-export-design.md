# Thiết Kế: Giữ Nguyên Văn Lô / Batch Quét Từ Phiếu Xuất Kho (XG-XUAT & TOLE-XUAT)

## 1. Tổng Quan & Mục Tiêu

Hệ thống quản lý xuất kho Đại Dũng (`xg-xuat` và `tole-xuat`) hỗ trợ chức năng quét OCR hình ảnh Phiếu Xuất Kho (Goods Issue Note) qua Gemini Vision AI.

Hiện tại, khi quét phiếu hoặc khi người dùng chỉnh sửa trường "Lô / Batch", hệ thống đang tự động biến đổi giá trị của Batch qua hàm `formatBatchForMaterialName()` (ví dụ: `2X349VN` bị đổi thành `2.0x349VN`, `2.5X350VN` bị đổi thành `2.5x350VN`). Điều này làm sai lệch dữ liệu gốc in trên phiếu xuất kho thực tế của nhà máy Đại Dũng.

**Mục tiêu**:
1. Đảm bảo ô nhập "Lô / Batch" (`.item-batch`) và bản ghi lưu trữ vào cơ sở dữ liệu (`Batch`) giữ **nguyên văn 100%** như in trên phiếu xuất kho (ví dụ: `2X349VN`, `2.5X350VN`).
2. Không tự ý sửa đổi hoa/thường hay thêm bớt số thập phân đối với trường `Batch`.
3. Tên vật tư (`tenVatTu`) vẫn tự động ghép Lô vào giữa tên (chuẩn hóa kích thước trong tên vật tư theo quy cách kỹ thuật, ví dụ `Thép phôi kẽm 2.0x349VN Z275 G450`).
4. Áp dụng đồng bộ cho cả 2 phân hệ: **Xuất Xà Gồ** (`xg-xuat`) và **Xuất Tole** (`tole-xuat`).

---

## 2. Thiết Kế Chi Tiết

### 2.1. Cập nhật Prompt OCR (AI Vision & Edge Function)
- **Tập tin**:
  - `supabase/functions/ocr-receipt/index.ts`
  - `assets/js/core/receipt-ocr-service.js`
- **Quy tắc bóc tách `batch`**:
  - Hướng dẫn AI: Cột `Lô / Batch` cần lấy chính xác nguyên văn từng ký tự như in trên phiếu xuất kho.
  - Giữ nguyên chữ in hoa, in thường và số (ví dụ in `2X349VN` thì trả về `2X349VN`, in `2.5X350VN` thì trả về `2.5X350VN`). Không tự ý biến đổi `X` thành `x`, không tự ý thêm `.0`.
  - Giữ nguyên `b = String(it.batch || '').trim()` trong danh sách `items` trả về.

### 2.2. Cập nhật Xử lý Frontend (`xg-xuat.js` & `tole-xuat.js`)
- **Tập tin**:
  - `assets/js/xg/xg-xuat.js`
  - `assets/js/tole/tole-xuat.js`
- **Hàm `populateFieldsFromOcr(data)`**:
  - Gán `batch: (it.batch || '').trim()` nguyên bản từ kết quả OCR cho từng mục hàng `multiItemsData`.
  - KHÔNG gọi `formatBatchForMaterialName()` lên `batch`.
  - `tenVatTu` gọi `mergeBatchIntoTenVatTu(rawTen, rawBatch)` để sinh tên vật tư có chứa quy cách kích thước chuẩn.
- **Sự kiện `change` trên ô nhập `Lô / Batch` (`batchInp`)**:
  - Khi người dùng nhập hoặc chỉnh sửa giá trị `Lô / Batch`: Giữ nguyên văn giá trị người dùng nhập (`item.batch = e.target.value.trim()`).
  - KHÔNG ghi đè giá trị ô nhập bằng `formatBatchForMaterialName()`.
  - Gọi `mergeBatchIntoTenVatTu(item.tenVatTu, newBatch)` để cập nhật ô Tên vật tư tương ứng.
  - Cập nhật tiêu đề thẻ mục hàng: `Mục #1 10001189 (Lô: 2X349VN) - Thép phôi kẽm 2.0x349VN Z275 G450`.
- **Modal Sửa Dữ Liệu (`openEditDataModal`)**:
  - Tương tự, sự kiện `change` trên `editBatchInp` giữ nguyên văn giá trị người dùng nhập, không ép đổi giá trị bằng `formatBatchForMaterialName()`.

---

## 3. Kế Hoạch Kiểm Thử

1. **Kiểm thử OCR Prompt & Normalization**:
   - Kiểm tra dữ liệu giả lập với `batch = '2X349VN'` và `batch = '2.5X350VN'`.
   - Kết quả `multiItemsData`:
     - Mục 1: `batch === '2X349VN'`, `tenVatTu === 'Thép phôi kẽm 2.0x349VN Z275 G450'`.
     - Mục 2: `batch === '2.5X350VN'`, `tenVatTu === 'Thép phôi kẽm 2.5x350VN Z275 G450'`.
2. **Kiểm thử Form Input Interaction**:
   - Nhập `2X349VN` vào ô `Lô / Batch`, kích hoạt sự kiện `change` hoặc `blur`.
   - Giá trị ô `Lô / Batch` vẫn giữ nguyên là `2X349VN`.
   - Ô `Tên vật tư` tự động cập nhật `Thép phôi kẽm 2.0x349VN Z275 G450`.
3. **Đồng bộ file**:
   - Chạy `node scripts/sync-dist.js` để cập nhật `public/`, `dist/`, và `dist-app/`.
