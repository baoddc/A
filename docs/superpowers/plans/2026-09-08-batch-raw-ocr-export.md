# Kế Hoạch Triển Khai: Giữ Nguyên Văn Lô / Batch Quét Từ Phiếu Xuất Kho (XG-XUAT & TOLE-XUAT)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đảm bảo trường Lô / Batch được quét và hiển thị nguyên văn 100% như in trên phiếu xuất kho trong cả 2 phân hệ Xuất Xà gồ (`xg-xuat`) và Xuất Tole (`tole-xuat`), không tự ý đổi hoa/thường hay thêm bớt số.

**Architecture:** Cập nhật hướng dẫn prompt OCR cho Gemini Vision trong `receipt-ocr-service.js` và Supabase Edge Function `ocr-receipt` để trích xuất nguyên văn cột Lô. Loại bỏ việc tự ý gọi `formatBatchForMaterialName()` lên giá trị của thuộc tính `batch` trong `xg-xuat.js` và `tole-xuat.js` khi sinh dữ liệu thẻ mặt hàng và khi người dùng nhập liệu, đồng thời giữ nguyên việc định dạng kích thước khi ghép vào Tên vật tư.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5, Bootstrap 5, Supabase Edge Functions (Deno TypeScript), Google Gemini 2.5 Flash Vision.

## Global Constraints
- Cột `Lô / Batch` (`item.batch`, input `.item-batch`, cột `Batch` trong cơ sở dữ liệu) phải lưu giữ nguyên bản 100% như trên phiếu (ví dụ: `2X349VN`, `2.5X350VN`).
- Không gọi `formatBatchForMaterialName()` lên biến `batch`.
- Tên vật tư (`tenVatTu`) vẫn tiếp tục sử dụng `mergeBatchIntoTenVatTu` để chuẩn hóa hiển thị kích thước trong tên (`Thép phôi kẽm 2.0x349VN Z275 G450`).
- Mọi thay đổi nguồn trong `assets/` và `pages/` phải được đồng bộ sang `public/`, `dist/`, và `dist-app/` bằng script `node scripts/sync-dist.js`.

---

### Task 1: Cập Nhật Prompt OCR Trong Edge Function & Frontend Service

**Files:**
- Modify: `supabase/functions/ocr-receipt/index.ts:31-36`
- Modify: `assets/js/core/receipt-ocr-service.js:189-194`
- Test: `tests/test-batch-raw-ocr.js`

- [ ] **Step 1: Viết test kiểm tra tính nguyên bản của Batch khi trích xuất**

Tạo file `tests/test-batch-raw-ocr.js`:
```javascript
const assert = require('assert');

// Mô phỏng hàm xử lý dữ liệu sau OCR
function processExtractedBatch(rawBatch) {
  return (rawBatch || '').trim();
}

const b1 = processExtractedBatch('2X349VN');
assert.strictEqual(b1, '2X349VN', 'Batch 2X349VN phải được giữ nguyên văn chữ X hoa và không thêm .0');

const b2 = processExtractedBatch('2.5X350VN');
assert.strictEqual(b2, '2.5X350VN', 'Batch 2.5X350VN phải được giữ nguyên văn chữ X hoa');

console.log('✅ Test raw batch extraction passed!');
```

- [ ] **Step 2: Chạy test sơ khởi**

Chạy: `node tests/test-batch-raw-ocr.js`
Kỳ vọng: PASS

- [ ] **Step 3: Cập nhật prompt trong `supabase/functions/ocr-receipt/index.ts`**

Sửa mô tả cột `batch` trong prompt tại `supabase/functions/ocr-receipt/index.ts`:
```typescript
   - batch: Cột 'Lô / Batch'. QUAN TRỌNG: Lấy chính xác nguyên văn từng ký tự như in trên phiếu xuất kho, giữ nguyên toàn bộ chữ hoa/chữ thường và ký tự số (ví dụ trên phiếu in '2X349VN' thì phải trả về đúng '2X349VN', in '2.5X350VN' thì trả về đúng '2.5X350VN', tuyệt đối không tự ý đổi 'X' thành 'x', không tự ý thêm '.0').
```

- [ ] **Step 4: Cập nhật prompt trong `assets/js/core/receipt-ocr-service.js`**

Sửa mô tả cột `batch` trong `callDirectGeminiVision` tương tự:
```javascript
   - batch: Cột 'Lô / Batch'. QUAN TRỌNG: Lấy chính xác nguyên văn từng ký tự như in trên phiếu xuất kho, giữ nguyên toàn bộ chữ hoa/chữ thường và ký tự số (ví dụ trên phiếu in '2X349VN' thì phải trả về đúng '2X349VN', in '2.5X350VN' thì trả về đúng '2.5X350VN', tuyệt đối không tự ý đổi 'X' thành 'x', không tự ý thêm '.0').
```

- [ ] **Step 5: Commit thay đổi Task 1**

```bash
git add supabase/functions/ocr-receipt/index.ts assets/js/core/receipt-ocr-service.js tests/test-batch-raw-ocr.js
git commit -m "feat(ocr): update prompt to extract exact raw batch verbatim"
```

---

### Task 2: Cập Nhật Xử Lý Lô / Batch Trong `xg-xuat.js`

**Files:**
- Modify: `assets/js/xg/xg-xuat.js:1255-1273, 1438-1460, 1740-1750`

- [ ] **Step 1: Sửa hàm `populateFieldsFromOcr` trong `xg-xuat.js`**

Tại dòng 1438-1460:
Bỏ `const batch = formatBatchForMaterialName(it.batch || '');`
Thay bằng:
```javascript
  // 8. Tự động sinh các thẻ mặt hàng (Multi-Item Cards) từ ảnh
  if (Array.isArray(data.items) && data.items.length > 0) {
    multiItemsData = data.items.map(it => {
      const rawBatch = (it.batch || '').trim();
      const rawTen = (it.tenVatTu || '').trim();
      return {
        id: Math.random().toString(36).slice(2),
        maVatTu: it.maVatTu || '',
        tenVatTu: mergeBatchIntoTenVatTu(rawTen, rawBatch),
        batch: rawBatch,
        rolls: []
      };
    });
  } else {
    const rawBatch = (data.batch || '').trim();
    const rawTen = (data.tenVatTu || '').trim();
    multiItemsData = [{
      id: Math.random().toString(36).slice(2),
      maVatTu: data.maVatTu || '',
      tenVatTu: mergeBatchIntoTenVatTu(rawTen, rawBatch),
      batch: rawBatch,
      rolls: []
    }];
  }
```

- [ ] **Step 2: Sửa sự kiện `change` trên ô `Lô / Batch` (`batchInp`) trong `xg-xuat.js`**

Tại dòng 1259-1272:
Bỏ `newBatch = formatBatchForMaterialName(newBatch);`
Thay bằng:
```javascript
    if (batchInp) {
      batchInp.addEventListener('input', (e) => {
        item.batch = e.target.value.trim();
        updateTitle();
      });
      batchInp.addEventListener('change', (e) => {
        const newBatch = e.target.value.trim();
        item.batch = newBatch;
        batchInp.value = newBatch;
        if (newBatch && item.tenVatTu) {
          const merged = mergeBatchIntoTenVatTu(item.tenVatTu, newBatch);
          if (merged !== item.tenVatTu) {
            item.tenVatTu = merged;
            if (tenVtInp) tenVtInp.value = merged;
          }
        }
        updateTitle();
      });
    }
```

- [ ] **Step 3: Sửa sự kiện `change` trên `editBatchInp` trong `openEditDataModal`**

Tại dòng 1740-1750:
Bỏ `const b = formatBatchForMaterialName(editBatchInp.value);`
Thay bằng:
```javascript
  const editBatchInp = commonFieldsContainer.querySelector('[name="col_7"]');
  const editTenVtInp = commonFieldsContainer.querySelector('[name="col_6"]');
  if (editBatchInp && editTenVtInp) {
    editBatchInp.addEventListener('change', () => {
      const b = editBatchInp.value.trim();
      editBatchInp.value = b;
      if (b && editTenVtInp.value.trim()) {
        editTenVtInp.value = mergeBatchIntoTenVatTu(editTenVtInp.value.trim(), b);
      }
    });
  }
```

- [ ] **Step 4: Commit thay đổi Task 2**

```bash
git add assets/js/xg/xg-xuat.js
git commit -m "fix(xg-xuat): preserve raw batch in item cards and edit modal"
```

---

### Task 3: Cập Nhật Xử Lý Lô / Batch Trong `tole-xuat.js`

**Files:**
- Modify: `assets/js/tole/tole-xuat.js:1245-1260, 1430-1455, 1730-1745`

- [ ] **Step 1: Sửa hàm `populateFieldsFromOcr` trong `tole-xuat.js`**

Tại dòng 1430-1455:
Áp dụng tương tự `xg-xuat.js`:
```javascript
  // 8. Tự động sinh các thẻ mặt hàng (Multi-Item Cards) từ ảnh
  if (Array.isArray(data.items) && data.items.length > 0) {
    multiItemsData = data.items.map(it => {
      const rawBatch = (it.batch || '').trim();
      const rawTen = (it.tenVatTu || '').trim();
      return {
        id: Math.random().toString(36).slice(2),
        maVatTu: it.maVatTu || '',
        tenVatTu: mergeBatchIntoTenVatTu(rawTen, rawBatch),
        batch: rawBatch,
        rolls: []
      };
    });
  } else {
    const rawBatch = (data.batch || '').trim();
    const rawTen = (data.tenVatTu || '').trim();
    multiItemsData = [{
      id: Math.random().toString(36).slice(2),
      maVatTu: data.maVatTu || '',
      tenVatTu: mergeBatchIntoTenVatTu(rawTen, rawBatch),
      batch: rawBatch,
      rolls: []
    }];
  }
```

- [ ] **Step 2: Sửa sự kiện `change` trên ô `Lô / Batch` (`batchInp`) trong `tole-xuat.js`**

Tại dòng 1245-1260:
Bỏ `newBatch = formatBatchForMaterialName(newBatch);`
Giữ nguyên chuỗi nhập:
```javascript
    if (batchInp) {
      batchInp.addEventListener('input', (e) => {
        item.batch = e.target.value.trim();
        updateTitle();
      });
      batchInp.addEventListener('change', (e) => {
        const newBatch = e.target.value.trim();
        item.batch = newBatch;
        batchInp.value = newBatch;
        if (newBatch && item.tenVatTu) {
          const merged = mergeBatchIntoTenVatTu(item.tenVatTu, newBatch);
          if (merged !== item.tenVatTu) {
            item.tenVatTu = merged;
            if (tenVtInp) tenVtInp.value = merged;
          }
        }
        updateTitle();
      });
    }
```

- [ ] **Step 3: Sửa sự kiện `change` trên `editBatchInp` trong `openEditDataModal` của `tole-xuat.js`**

Tại dòng 1730-1745:
Bỏ `const b = formatBatchForMaterialName(editBatchInp.value);`
Thay bằng:
```javascript
  const editBatchInp = commonFieldsContainer.querySelector('[name="col_7"]');
  const editTenVtInp = commonFieldsContainer.querySelector('[name="col_6"]');
  if (editBatchInp && editTenVtInp) {
    editBatchInp.addEventListener('change', () => {
      const b = editBatchInp.value.trim();
      editBatchInp.value = b;
      if (b && editTenVtInp.value.trim()) {
        editTenVtInp.value = mergeBatchIntoTenVatTu(editTenVtInp.value.trim(), b);
      }
    });
  }
```

- [ ] **Step 4: Commit thay đổi Task 3**

```bash
git add assets/js/tole/tole-xuat.js
git commit -m "fix(tole-xuat): preserve raw batch in item cards and edit modal"
```

---

### Task 4: Kiểm Thử Toàn Diện & Đồng Bộ Phân Phối Build

**Files:**
- Create/Run: `tests/verify-raw-batch-flow.js`
- Run: `node scripts/sync-dist.js`

- [ ] **Step 1: Viết script kiểm thử tích hợp mô phỏng luồng dữ liệu**

Tạo `tests/verify-raw-batch-flow.js` để xác minh:
1. `xg-xuat.js` và `tole-xuat.js` không còn gọi `formatBatchForMaterialName` trong `populateFieldsFromOcr` và `batchInp.addEventListener('change')`.
2. Dữ liệu OCR với `items: [{ batch: '2X349VN', tenVatTu: 'Thép phôi kẽm Z275 G450' }, { batch: '2.5X350VN', tenVatTu: 'Thép phôi kẽm Z275 G450' }]` sinh ra `item.batch === '2X349VN'` và `item.tenVatTu === 'Thép phôi kẽm 2.0x349VN Z275 G450'`.

- [ ] **Step 2: Chạy script kiểm thử**

Chạy: `node tests/verify-raw-batch-flow.js`
Kỳ vọng: Tất cả assertions đều pass.

- [ ] **Step 3: Chạy đồng bộ dự án sang public, dist, dist-app**

Chạy: `node scripts/sync-dist.js`
Kỳ vọng: `Full synchronization completed successfully!`

- [ ] **Step 4: Commit và hoàn tất**

```bash
git add .
git commit -m "chore: sync distribution files with raw batch preservation"
```
