/* ==================================================================
   PETS – KỸ NĂNG TẤN CÔNG
   Đòn tấn công (triggerAttack), quả cầu lửa bay, vụ nổ, cập nhật đạn.
   spawnExplosion có móc battleOnBlast (battle/enemies.js) để gây sát thương lan.
   ================================================================== */

// Hàm kích hoạt lệnh bắn
// Khai báo mảng chứa đạn và vụ nổ
let PROJECTILES = [];
let EXPLOSIONS = [];

// Hàm kích hoạt tấn công (Chỉ cho Shibav3_1)
// kind: 'attack' (đòn thường, Enter) hoặc 'skill1' (phím 1, có thời gian hồi skill1Cd)
function triggerAttack(pet, kind = 'attack') {
  if (!pet || !pet.def[kind+'AnimFrames'] || pet.isAttacking) return;
  if (kind !== 'attack') { if (pet.skillCd > 0) return; pet.skillCd = pet.def[kind+'Cd'] ?? 5; }
  pet.atkKind = kind;
  pet.isAttacking = true; pet.sleepUntil = 0; pet.sleeping = false;
  pet.attackTime = 0;
  pet.hasFired = false;
}

// Hàm sinh quả cầu lửa bay tới điểm chỉ định
// Khung quả cầu / vụ nổ theo loại đòn: 'attack' dùng fireball/explosion, 'skill1' dùng skill1Ball/skill1Blast
const ballFrames  = (def, kind) => kind === 'attack' ? def.fireballFrames  : def[kind+'BallFrames'];
const blastFrames = (def, kind) => kind === 'attack' ? def.explosionFrames : def[kind+'BlastFrames'];
const ballFps  = (def, kind) => (kind === 'attack' ? def.fireballFps  : def[kind+'BallFps'])  || 6.67;
const blastFps = (def, kind) => (kind === 'attack' ? def.explosionFps : def[kind+'BlastFps']) || 16.7;

function spawnFireball(pet, targetX, targetY, kind = 'attack') {
  const fireX = pet.x + (pet.facingLeft ? -40 : 40);
  const fireY = pet.y - 45;

  const dx = targetX - fireX;
  const dy = targetY - fireY;
  const targetDist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  PROJECTILES.push({
    x: fireX,
    y: fireY,
    startX: fireX,
    startY: fireY,
    targetX: targetX,
    targetY: targetY,
    maxDistance: targetDist,
    vx: Math.cos(angle) * (kind === 'attack' ? FIREBALL_SPEED : (pet.def[kind+'Speed'] ?? FIREBALL_SPEED)),
    vy: Math.sin(angle) * (kind === 'attack' ? FIREBALL_SPEED : (pet.def[kind+'Speed'] ?? FIREBALL_SPEED)),
    kind: kind,
    rotation: angle,
    map: pet.map,
    def: pet.def,
    life: FIREBALL_LIFESPAN,
    animFrame: 0,
    animTime: 0
  });
}

// Hàm sinh vụ nổ
function spawnExplosion(x, y, map, def, kind = 'attack') {
  if (typeof battleOnBlast === 'function') 
    battleOnBlast(x, y, map, def, kind);
  if (!def || !blastFrames(def, kind)) return;
  EXPLOSIONS.push({
    map: map,
    def: def,
    kind: kind,
    x: x,
    y: y,
    frame: 1,
    animTime: 0
  });
}

// Hàm cập nhật đạn và vụ nổ theo thời gian
function updateProjectiles(dt) {
  for (let i = PROJECTILES.length - 1; i >= 0; i--) {
    const p = PROJECTILES[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    p.animTime += dt;
    if (p.animTime >= 1/ballFps(p.def, p.kind || 'attack')) { 
      p.animTime = 0;
      const bf = ballFrames(p.def, p.kind || 'attack');
      p.animFrame = (p.animFrame + 1) % (bf ? bf.length : 1);
    }

    const travelled = Math.hypot(p.x - p.startX, p.y - p.startY);

    // Chạm vị trí đích -> Tạo vụ nổ và xóa quả cầu
    if (travelled >= p.maxDistance || p.life <= 0 || p.x < 0 || p.x > CW || p.y < 0 || p.y > CH) {
      spawnExplosion(p.targetX || p.x, p.targetY || p.y, p.map, p.def, p.kind || 'attack');
      PROJECTILES.splice(i, 1);
    }
  }

  // Cập nhật hiệu ứng vụ nổ
  for (let i = EXPLOSIONS.length - 1; i >= 0; i--) {
    const ex = EXPLOSIONS[i];
    ex.animTime += dt;
    if (ex.animTime >= 1/blastFps(ex.def, ex.kind || 'attack')) {
      ex.animTime = 0;
      ex.frame++;
      if (ex.frame > blastFrames(ex.def, ex.kind || 'attack').length) {
        EXPLOSIONS.splice(i, 1);
      }
    }
  }
}
