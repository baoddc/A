const assert = require('assert');

// Giả lập logic kiểm tra quyền xóa kiểm kê
function canUserDeleteKiemKe(mockProfile, mockCurrentUser) {
  if (mockProfile && (mockProfile.is_admin || String(mockProfile.username || '').toLowerCase() === 'bao.lt')) {
    return true;
  }
  if (mockCurrentUser && String(mockCurrentUser).trim().toLowerCase() === 'bao.lt') {
    return true;
  }
  return false;
}

// Giả lập hàm sinh nút xóa từng cuộn trong bảng Tab 2
function renderRowDeleteAction(rollId, canDelete) {
  if (!canDelete) {
    return `<span class="text-muted"><i class="bi bi-lock-fill" title="Chỉ bao.lt mới có quyền xóa"></i></span>`;
  }
  return `<button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 btn-delete-scanned" data-id="${rollId}" title="Xóa cuộn này"><i class="bi bi-x-lg"></i></button>`;
}

console.log('=== RUNNING TESTS: kiem-ke-supabase-perm.test.js ===');

// Test 1: User bao.lt trong profile -> có quyền xóa
assert.strictEqual(
  canUserDeleteKiemKe({ username: 'bao.lt', is_admin: false }, null),
  true,
  'Test 1 Failed: User bao.lt in user_profile must have delete permission'
);
console.log('✔ Test 1: User bao.lt trong user_profile có quyền xóa');

// Test 2: User bao.lt trong localStorage currentUser -> có quyền xóa
assert.strictEqual(
  canUserDeleteKiemKe(null, 'bao.lt'),
  true,
  'Test 2 Failed: User bao.lt in localStorage must have delete permission'
);
console.log('✔ Test 2: User bao.lt trong localStorage có quyền xóa');

// Test 3: User có cờ is_admin = true -> có quyền xóa
assert.strictEqual(
  canUserDeleteKiemKe({ username: 'admin_sys', is_admin: true }, null),
  true,
  'Test 3 Failed: Admin user must have delete permission'
);
console.log('✔ Test 3: Admin user có quyền xóa');

// Test 4: User nhân viên bình thường (kho_xg, tole_user) -> KHÔNG có quyền xóa
assert.strictEqual(
  canUserDeleteKiemKe({ username: 'kho_xg', is_admin: false }, 'kho_xg'),
  false,
  'Test 4 Failed: Normal user must NOT have delete permission'
);
assert.strictEqual(
  canUserDeleteKiemKe(null, 'nv_tole'),
  false,
  'Test 4 Failed: User nv_tole must NOT have delete permission'
);
console.log('✔ Test 4: User thông thường bị chặn quyền xóa');

// Test 5: Khách / Chưa đăng nhập (null) -> KHÔNG có quyền xóa
assert.strictEqual(
  canUserDeleteKiemKe(null, null),
  false,
  'Test 5 Failed: Guest / null user must NOT have delete permission'
);
console.log('✔ Test 5: Người dùng chưa đăng nhập bị chặn quyền xóa');

// Test 6: Kiểm tra sinh HTML nút xóa
const htmlBaoLt = renderRowDeleteAction('roll-123', true);
assert.ok(htmlBaoLt.includes('btn-delete-scanned'), 'Test 6 Failed: bao.lt must see delete button');

const htmlOther = renderRowDeleteAction('roll-123', false);
assert.ok(!htmlOther.includes('btn-delete-scanned'), 'Test 6 Failed: Other users must NOT see delete button');
assert.ok(htmlOther.includes('bi-lock-fill'), 'Test 6 Failed: Other users must see lock icon');
console.log('✔ Test 6: HTML nút xóa hiển thị đúng theo phân quyền');

console.log('\n🎉 ALL KIEM KE PERMISSION TESTS PASSED!\n');
