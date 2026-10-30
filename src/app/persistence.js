/**
 * 持久化端口（Port）。
 *
 * 领域层与应用层只认识 storage.read / write / remove 三个方法，
 * 具体落到 localStorage 还是内存由这里决定。浏览器禁用存储（隐私模式、
 * file:// 直开）时自动降级为内存实现，应用照常运行，只是关掉页面即丢。
 */

function createMemoryStorage() {
  const mem = new Map();
  return {
    read: (k) => (mem.has(k) ? mem.get(k) : null),
    write: (k, v) => { mem.set(k, String(v)); return true; },
    remove: (k) => { mem.delete(k); },
    kind: 'memory',
  };
}

function createLocalStorage(ls) {
  return {
    read: (k) => {
      try { return ls.getItem(k); } catch { return null; }
    },
    write: (k, v) => {
      try { ls.setItem(k, String(v)); return true; } catch { return false; }
    },
    remove: (k) => { try { ls.removeItem(k); } catch { /* 忽略：无权限即视为已删 */ } },
    kind: 'localStorage',
  };
}

function detectBackend() {
  try {
    if (typeof localStorage === 'undefined') return createMemoryStorage();
    const probe = '__pet_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return createLocalStorage(localStorage);
  } catch {
    return createMemoryStorage();
  }
}

let backend = detectBackend();

export const storage = {
  read: (k) => backend.read(k),
  write: (k, v) => backend.write(k, v),
  remove: (k) => backend.remove(k),
  get kind() { return backend.kind; },
};

/** 测试用：替换底层实现 */
export function useStorage(next) {
  backend = next;
}
