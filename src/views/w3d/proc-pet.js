/**
 * 程序化宠物体型：鱼 / 爬行 / 蛙 / 昆虫四类低模，零字节资产。
 *
 * 目录里这些物种不保证有 GLB（借不到同科模型的鱼 / 爬行 / 蛙 / 蚁就是这种），
 * 兜底就用 three 原生几何体（Sphere / Box / Cylinder / Cone）现场搭一只：
 *   - 不加载任何外部资源，不占网络、不占磁盘、没有异步失败点；
 *   - 没有骨骼，靠 update(t, moving) 手写摆动 —— 尾巴摇、鳍扇、腿扫、身体起伏；
 *   - 外层 group 只负责被 AI 摆放（位置 / 朝向），所有摆动都作用在内层 rig 上，
 *     免得和 ai.js 每帧写的 pet.position / pet.rotation 打架。
 *
 * 优先级在 data/w3d-assets.js 的 modelFor：本体 GLB → alias 替补 → 这里的体型。
 * dev/check-assets.js 与 dev/test/w3d-assets.test.js 会核对 PROC_PETS 里的每个体型
 * 都有 PROC_BUILDERS 的 builder，所以这里增删体型要同步数据层。
 *
 * 注意：模块加载阶段不碰 THREE（浏览器里靠 three.min.js 的全局，node 单测里只查表）。
 */

/** 体型默认色 + 个别品种微调色（two-tone：main 主体 / alt 副色，如龟壳、鱼鳍） */
const PALETTE = {
  fish: { main: 0xE8973C, alt: 0xF6C173 },
  reptile: { main: 0x6FAF62, alt: 0xE8D9A6 },
  frog: { main: 0x6CC24A, alt: 0xF6F1DC },
  insect: { main: 0x4A3B33, alt: 0x7A5F4A },
  // 品种微调
  goldfish: { main: 0xF2A33C, alt: 0xF7C87A },
  koi: { main: 0xF6F1E7, alt: 0xE8703A },
  tropical: { main: 0x4FB6E8, alt: 0xF2E14C },
  turtle: { main: 0x5E8F4E, alt: 0x8A6A44 },
  lizard: { main: 0x8CB24F, alt: 0xC9DE8A },
  gecko: { main: 0xE4B44C, alt: 0xF7E1A3 },
  snake: { main: 0xB08A5A, alt: 0x6F5A3C },
  ant: { main: 0x4A3B33, alt: 0x7A5F4A },
};

/** 材质按颜色缓存：一只宠物二十来个网格，同色共用一份即可 */
const MATS = new Map();
function mat(color) {
  let m = MATS.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    MATS.set(color, m);
  }
  return m;
}

function palette(key, kind) {
  return PALETTE[key] || PALETTE[kind] || PALETTE.fish;
}

/** 球体快捷构造（半径 / 颜色 / 经向段数） */
function ball(r, color, seg) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg || 12, Math.max(6, (seg || 12) - 4)), mat(color));
}

/** 锥体「鳍 / 尾 / 尖角」：默认轴朝 +Y，用 rotation.x = -PI/2 折成朝 -Z */
function spike(r, h, color, flat) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), mat(color));
  if (flat) mesh.scale.set(flat, 1, 1);
  return mesh;
}

/* ---------------------------- 鱼：金鱼 / 锦鲤 / 热带鱼 ---------------------------- */
function fish(key) {
  const c = palette(key, 'fish');
  const group = new THREE.Group();
  const rig = new THREE.Group();
  rig.position.y = 0.5; // 悬在草面之上一点，靠上下浮动显得在游
  group.add(rig);

  // 身体：拉长的椭球
  const body = ball(0.3, c.main, 16);
  body.scale.set(0.72, 0.8, 1.5);
  rig.add(body);

  // 眼睛（偏前上方）
  [-1, 1].forEach((side) => {
    const eye = ball(0.055, 0x1B2430, 8);
    eye.position.set(side * 0.13, 0.1, 0.28);
    rig.add(eye);
  });

  // 尾鳍：绕根部左右扫
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, -0.42);
  rig.add(tailPivot);
  const tail = spike(0.24, 0.4, c.alt, 0.22);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -0.18;
  tailPivot.add(tail);

  // 背鳍
  const dorsal = spike(0.16, 0.26, c.alt, 0.18);
  dorsal.position.set(0, 0.2, -0.02);
  rig.add(dorsal);

  // 胸鳍：左右小幅扇动
  const fins = [-1, 1].map((side) => {
    const fin = spike(0.1, 0.22, c.alt, 0.3);
    fin.position.set(side * 0.19, -0.02, 0.16);
    fin.rotation.z = side * 0.9;
    rig.add(fin);
    return fin;
  });

  return {
    group,
    update(t, moving) {
      const beat = moving ? 8 : 3.2;
      // 悬停起伏 + 轻微侧倾
      rig.position.y = 0.5 + Math.sin(t * 1.9) * (moving ? 0.09 : 0.05);
      rig.rotation.z = Math.sin(t * beat * 0.5) * 0.07;
      // 尾巴：走动时甩得更开
      tailPivot.rotation.y = Math.sin(t * beat) * (moving ? 0.5 : 0.26);
      // 鳍：交替扇
      fins[0].rotation.z = -0.9 + Math.sin(t * beat) * 0.25;
      fins[1].rotation.z = 0.9 - Math.sin(t * beat) * 0.25;
    },
  };
}

/* ---------------------- 爬行：乌龟 / 蜥蜴 / 守宫 / 蛇 ---------------------- */
function reptile(key) {
  const c = palette(key, 'reptile');
  const snake = key === 'snake';
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);

  // 躯干：低伏的椭球，蛇拉得更长更细
  const body = ball(0.26, c.main, 14);
  body.scale.set(0.85, snake ? 0.5 : 0.62, snake ? 2.2 : 1.5);
  body.position.y = snake ? 0.17 : 0.24;
  rig.add(body);

  // 头：略扁的楔形
  const head = ball(0.15, c.main, 12);
  head.scale.set(1, 0.8, 1.25);
  head.position.set(0, snake ? 0.19 : 0.26, snake ? 0.62 : 0.4);
  rig.add(head);

  [-1, 1].forEach((side) => {
    const eye = ball(0.045, 0x1B2430, 8);
    eye.position.set(side * 0.08, head.position.y + 0.07, head.position.z + 0.08);
    rig.add(eye);
  });

  // 尾巴：绕根部左右摆
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, body.position.y, snake ? -0.5 : -0.28);
  rig.add(tailPivot);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, snake ? 0.85 : 0.6, 8), mat(c.main));
  tail.rotation.x = -Math.PI / 2; // 锥尖朝 -Z
  tail.scale.set(1, 1, 0.55); // 压扁成蛇 / 蜥蜴尾巴的截面
  tail.position.z = -(snake ? 0.5 : 0.3);
  tailPivot.add(tail);

  // 四足：外撇贴地；蛇没有腿
  const legs = [];
  if (!snake) {
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.3, 6), mat(c.main));
      leg.position.set(sx * 0.21, 0.15, sz * 0.22);
      leg.rotation.z = sx * 0.55;
      rig.add(leg);
      legs.push(leg);
    });
  }

  // 龟壳：半球盖在背上
  if (key === 'turtle') {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(c.alt),
    );
    shell.scale.set(0.95, 0.6, 1.25);
    shell.position.set(0, 0.26, 0);
    rig.add(shell);
  }

  const headY = head.position.y;

  return {
    group,
    update(t, moving) {
      const step = moving ? 10 : 2.4;
      // 蛇是左右游走，四足是点头 + 迈腿
      if (snake) {
        rig.rotation.y = Math.sin(t * (moving ? 4 : 1.2)) * 0.18;
        head.position.x = Math.sin(t * step * 0.4) * 0.03;
        tailPivot.rotation.y = Math.sin(t * step * 0.5) * (moving ? 0.55 : 0.2);
      } else {
        head.position.y = headY + Math.sin(t * step * 0.6) * (moving ? 0.04 : 0.015);
        tailPivot.rotation.y = Math.sin(t * step * 0.5) * (moving ? 0.35 : 0.14);
        legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(t * step + (i % 2 ? Math.PI : 0)) * (moving ? 0.5 : 0);
        });
      }
    },
  };
}

/* -------------------------------- 蛙 -------------------------------- */
function frog(key) {
  const c = palette(key, 'frog');
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);

  // 蹲坐的躯干
  const body = ball(0.3, c.main, 14);
  body.scale.set(1.05, 0.72, 1.15);
  body.position.y = 0.26;
  rig.add(body);

  // 嘴线：压扁的方块压在身体前缘
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.045, 0.12), mat(0x2E4A21));
  mouth.position.set(0, 0.19, 0.3);
  rig.add(mouth);

  // 凸眼：白眼球 + 黑瞳
  const eyes = [-1, 1].map((side) => {
    const white = ball(0.1, c.alt, 10);
    white.position.set(side * 0.15, 0.45, 0.16);
    rig.add(white);
    const pupil = ball(0.045, 0x1B2430, 8);
    pupil.position.set(side * 0.15, 0.46, 0.25);
    rig.add(pupil);
    return white;
  });

  // 后腿：折叠的粗圆柱 + 蹼状脚掌
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.36, 8), mat(c.main));
    leg.position.set(side * 0.27, 0.17, -0.14);
    leg.rotation.z = side * 0.9;
    rig.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.28), mat(c.main));
    foot.position.set(side * 0.31, 0.03, -0.02);
    rig.add(foot);
    return leg;
  });

  // 前腿：短柱撑地
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.2, 6), mat(c.main));
    arm.position.set(side * 0.17, 0.1, 0.18);
    rig.add(arm);
  });

  return {
    group,
    update(t, moving) {
      // 走起来是原地蹦，待机是呼吸 + 鼓眼
      rig.position.y = moving ? Math.abs(Math.sin(t * 7)) * 0.2 : Math.abs(Math.sin(t * 1.7)) * 0.015;
      rig.scale.y = moving ? 1 : 1 + Math.sin(t * 2.4) * 0.03;
      eyes.forEach((eye, i) => {
        eye.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.05);
      });
      legs.forEach((leg, i) => {
        leg.rotation.z = (i ? 1 : -1) * (0.9 + (moving ? Math.sin(t * 7) * 0.18 : 0));
      });
    },
  };
}

/* ------------------------------ 昆虫：蚂蚁 ------------------------------ */
function insect(key) {
  const c = palette(key, 'insect');
  const group = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(1.5); // 真蚂蚁太小，按"宠物尺寸"放大
  group.add(rig);

  // 头 / 胸 / 腹三段
  const head = ball(0.11, c.main, 12);
  head.position.set(0, 0.26, 0.3);
  rig.add(head);
  const thorax = ball(0.1, c.alt, 12);
  thorax.position.set(0, 0.24, 0.1);
  rig.add(thorax);
  const gaster = ball(0.15, c.main, 12);
  gaster.scale.set(1, 0.85, 1.3);
  gaster.position.set(0, 0.22, -0.16);
  rig.add(gaster);

  // 复眼 + 触角（触角会抖）
  const horns = [];
  [-1, 1].forEach((side) => {
    const eye = ball(0.035, 0x1B2430, 8);
    eye.position.set(side * 0.06, 0.3, 0.38);
    rig.add(eye);
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.24, 6), mat(c.main));
    horn.position.set(side * 0.07, 0.4, 0.44);
    horn.rotation.set(-0.6, 0, side * 0.4);
    rig.add(horn);
    horns.push(horn);
  });

  // 六条腿：每侧三条，细圆柱外撇
  const legs = [];
  [-1, 1].forEach((side) => {
    [0.2, 0.1, 0].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.014, 0.3, 5), mat(0x2A211C));
      leg.position.set(side * 0.14, 0.12, z);
      leg.rotation.z = side * 0.9;
      rig.add(leg);
      legs.push(leg);
    });
  });

  return {
    group,
    update(t, moving) {
      const scurry = moving ? 16 : 4;
      rig.position.y = Math.abs(Math.sin(t * scurry * 0.5)) * (moving ? 0.03 : 0.006);
      rig.rotation.z = Math.sin(t * (moving ? 12 : 2)) * 0.03;
      horns.forEach((horn, i) => {
        horn.rotation.x = -0.6 + Math.sin(t * 3 + i * 1.2) * 0.15;
      });
      legs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(t * scurry + (i % 2 ? Math.PI : 0)) * (moving ? 0.6 : 0.1);
      });
    },
  };
}

/** 体型标识 → builder。键必须与 data/w3d-assets.js 的 PROC_PETS 取值一一对应。 */
export const PROC_BUILDERS = { fish, reptile, frog, insect };

/**
 * 现搭一只程序化宠物。
 *
 * @param {string} kind 体型标识（PROC_PETS 的取值）
 * @param {string} [key] 品种 key，只用来挑配色（金鱼橙 / 锦鲤白 / 热带鱼蓝 …）
 * @returns {{group: object, update: (t: number, moving: boolean) => void} | null} 未知体型返回 null
 */
export function buildProcPet(kind, key) {
  const build = PROC_BUILDERS[kind];
  if (!build) return null;
  return build(String(key || ''));
}
