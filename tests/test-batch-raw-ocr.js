const assert = require('assert');

// Mô phỏng hàm trích xuất và xử lý dữ liệu batch sau OCR
function processExtractedBatch(rawBatch) {
  return (rawBatch || '').trim();
}

const b1 = processExtractedBatch('2X349VN');
assert.strictEqual(b1, '2X349VN', 'Batch 2X349VN phải được giữ nguyên văn chữ X hoa và không thêm .0');

const b2 = processExtractedBatch('2.5X350VN');
assert.strictEqual(b2, '2.5X350VN', 'Batch 2.5X350VN phải được giữ nguyên văn chữ X hoa');

console.log('✅ Test raw batch extraction passed!');
