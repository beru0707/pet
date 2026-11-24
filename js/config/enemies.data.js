// DỮ LIỆU QUÁI – file này do công cụ căn (repo 'character') đọc và GHI TRỰC TIẾP (nút "Mở thư mục game" / "Lưu vào game"); cũng sửa tay được.
// Phải là JSON hợp lệ sau 'const ENEMY_DATA =' (khoá có dấu nháy kép, không chú thích, không dấu phẩy thừa). Giải thích các trường: xem js/config/battle.js.
const ENEMY_DATA = {
  "defs": [
    {"key":"zombie","name":"Zombie","dir":"ZOMBIE","scale":1,"ox":0.09,"oy":0.152,"sw":449,"sh":531,"spriteLeft":true,"hp":80,"dmg":10,"speed":44,"bar":77,"range":95,"cd":1.3},
    {"key":"skeleton","name":"Skeleton","dir":"SKELETON","scale":0.95,"ox":0.07,"oy":0.121,"sw":456,"sh":507,"spriteLeft":true,"hp":55,"dmg":8,"speed":52,"runMul":1.7,"bar":77,"range":520,"stop":330,"cd":1.9,"proj":{"sheet":"stone","size":32,"speed":430,"dx":25,"dy":32,"life":2,"spin":9}}
  ],
  "anim": {
    "zombie": { "extra": {
      "idle": {"src":"Enemy/ZOMBIE/01-Idle/01-Idle.png","cols":4,"rows":3,"max":240,"fps":10},
      "walk": {"src":"Enemy/ZOMBIE/02-Walk/02-Walk.png","cols":4,"rows":3,"max":240,"fps":12},
      "attack": {"src":"Enemy/ZOMBIE/03-Attack/03-Attack.png","cols":4,"rows":2,"max":240,"fps":12,"hitAt":4},
      "hurt": {"src":"Enemy/ZOMBIE/04-Hurt/04-Hurt.png","cols":3,"rows":2,"max":240,"fps":14},
      "dead": {"src":"Enemy/ZOMBIE/05-Dead/01-Dead.png","cols":5,"rows":2,"max":240,"fps":12},
      "dead2": {"src":"Enemy/ZOMBIE/05-Dead/02-Dead.png","cols":5,"rows":2,"max":240,"fps":12}
    } },
    "skeleton": { "extra": {
      "idle": {"src":"Enemy/SKELETON/01-Idle/01-Idle.png","cols":4,"rows":3,"max":240,"fps":10},
      "walk": {"src":"Enemy/SKELETON/02-Walk/02-Walk.png","cols":4,"rows":3,"max":240,"fps":12},
      "run": {"src":"Enemy/SKELETON/03-Run/03-Run.png","cols":5,"rows":2,"max":240,"fps":14},
      "attack": {"src":"Enemy/SKELETON/04-Throw/04-Throw.png","cols":4,"rows":2,"max":240,"fps":12,"hitAt":3},
      "hurt": {"src":"Enemy/SKELETON/05-Hurt/05-Hurt.png","cols":3,"rows":2,"max":240,"fps":14},
      "dead": {"src":"Enemy/SKELETON/06-Dead/01-Dead.png","cols":5,"rows":2,"max":240,"fps":12},
      "dead2": {"src":"Enemy/SKELETON/06-Dead/02-Dead.png","cols":5,"rows":2,"max":240,"fps":12},
      "stone": {"src":"Enemy/SKELETON/STONE/Stone.png","cols":1,"rows":1,"max":96}
    } }
  }
};
