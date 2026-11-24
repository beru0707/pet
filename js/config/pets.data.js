// DỮ LIỆU THÚ – file này do công cụ căn (repo 'character') đọc và GHI TRỰC TIẾP (nút "Mở thư mục game" / "Lưu vào game"); cũng sửa tay được.
// Phải là JSON hợp lệ sau 'const PET_DATA =' (khoá có dấu nháy kép, không có chú thích, không dấu phẩy thừa). Giải thích các trường: xem js/config/pets.js.
const PET_DATA = {
  "defs": [
    {"name":"Chicken","dir":"CHICKEN","scale":1,"ox":0.115,"oy":0.109,"vis":0.759,"barDY":79.1,"sw":174,"sh":200,"spriteLeft":true},
    {"name":"Ducky","dir":"DUCKY","scale":1,"ox":0.104,"oy":0.109,"vis":0.751,"barDY":77.5,"sw":172,"sh":200,"spriteLeft":true},
    {"name":"Penguin","dir":"PENGUIN","scale":1,"ox":0.106,"oy":0.109,"vis":0.753,"barDY":77.9,"sw":173,"sh":200,"spriteLeft":true},
    {"name":"Piggy","dir":"PIGGY","scale":1,"ox":0.076,"oy":0.125,"vis":0.723,"barDY":71.8,"sw":180,"sh":200,"spriteLeft":true},
    {"name":"Polar","dir":"POLAR","scale":1,"ox":0.106,"oy":0.117,"vis":0.757,"barDY":78.9,"sw":172,"sh":200,"spriteLeft":true},
    {"name":"Reindeer","dir":"REINDEER","scale":1.212,"ox":0.063,"oy":0.215,"vis":0.619,"barDY":63.9,"sw":182,"sh":200,"spriteLeft":true},
    {"name":"Tanuki","dir":"TANUKI","scale":1,"ox":0.066,"oy":0.117,"vis":0.745,"barDY":76.3,"sw":175,"sh":200,"spriteLeft":true},
    {"name":"Teddy","dir":"TEDDY","scale":1,"ox":0.106,"oy":0.117,"vis":0.757,"barDY":78.9,"sw":172,"sh":200,"spriteLeft":true}
  ],
  "anim": {
    "Chicken": { "extra": {
      "walk": {"src":"Character/CHICKEN/03-Walk/03-Walk.png","cols":4,"rows":3,"max":176,"stride":0.705},
      "idle": {"src":"Character/CHICKEN/01-Idle/02-Idle_Blink.png","cols":4,"rows":3,"max":176,"fps":10,"scale":0.995},
      "attack": {"src":"Character/CHICKEN/02-Throw/02-Throw.png","cols":4,"rows":2,"max":176,"fps":12.5,"dx":0.004},
      "run": {"src":"Character/CHICKEN/04-Run/04-Run.png","cols":5,"rows":2,"max":176,"dx":0.004,"dy":0.012},
      "jumpup": {"src":"Character/CHICKEN/06-Jump/01-Jump_Up.png","cols":5,"rows":1,"max":176,"dx":0.004},
      "jumpfall": {"src":"Character/CHICKEN/06-Jump/02-Jump_Fall.png","cols":5,"rows":1,"max":176,"dx":-0.008},
      "jumpthrow": {"src":"Character/CHICKEN/06-Jump/03-Jump_Throw.png","cols":4,"rows":2,"max":176,"dx":-0.027},
      "hurt": {"src":"Character/CHICKEN/07-Hurt/01-Hurt.png","cols":3,"rows":2,"max":176,"dx":0.02,"dy":-0.008},
      "dizzy": {"src":"Character/CHICKEN/07-Hurt/02-Hurt_Dizzy.png","cols":5,"rows":2,"max":176,"dx":-0.012},
      "dead": {"src":"Character/CHICKEN/08-Dead/08-Dead.png","cols":5,"rows":2,"max":176,"dx":-0.123,"dy":-0.008}
    } },
    "Ducky": { "extra": {
      "walk": {"src":"Character/DUCKY/03-Walk/03-Walk.png","cols":4,"rows":3,"max":176,"stride":0.711},
      "idle": {"src":"Character/DUCKY/01-Idle/02-Idle_Blink.png","cols":4,"rows":3,"max":176,"fps":10,"scale":0.995,"dy":0.004},
      "attack": {"src":"Character/DUCKY/02-Throw/02-Throw.png","cols":4,"rows":2,"max":176,"fps":12.5,"dx":0.006,"dy":0.004},
      "run": {"src":"Character/DUCKY/04-Run/04-Run.png","cols":5,"rows":2,"max":176,"dx":0.006,"dy":0.012},
      "jumpup": {"src":"Character/DUCKY/06-Jump/01-Jump_Up.png","cols":5,"rows":1,"max":176,"dx":0.008},
      "jumpfall": {"src":"Character/DUCKY/06-Jump/02-Jump_Fall.png","cols":5,"rows":1,"max":176,"dx":-0.004},
      "jumpthrow": {"src":"Character/DUCKY/06-Jump/03-Jump_Throw.png","cols":4,"rows":2,"max":176,"dx":-0.027},
      "hurt": {"src":"Character/DUCKY/07-Hurt/01-Hurt.png","cols":3,"rows":2,"max":176,"dx":0.022,"dy":-0.004},
      "dizzy": {"src":"Character/DUCKY/07-Hurt/02-Hurt_Dizzy.png","cols":5,"rows":2,"max":176,"dx":-0.01,"dy":0.004},
      "dead": {"src":"Character/DUCKY/08-Dead/08-Dead.png","cols":5,"rows":2,"max":176,"dx":-0.108,"dy":-0.008}
    } },
    "Penguin": { "extra": {
      "walk": {"src":"Character/PENGUIN/03-Walk/03-Walk.png","cols":4,"rows":3,"max":176,"stride":0.708},
      "idle": {"src":"Character/PENGUIN/01-Idle/02-Idle_Blink.png","cols":4,"rows":3,"max":176,"fps":10,"scale":0.995,"dx":0.002,"dy":0.004},
      "attack": {"src":"Character/PENGUIN/02-Throw/02-Throw.png","cols":4,"rows":2,"max":176,"fps":12.5,"dx":0.006,"dy":0.004},
      "run": {"src":"Character/PENGUIN/04-Run/04-Run.png","cols":5,"rows":2,"max":176,"dx":0.008,"dy":0.012},
      "jumpup": {"src":"Character/PENGUIN/06-Jump/01-Jump_Up.png","cols":5,"rows":1,"max":176,"dx":0.008},
      "jumpfall": {"src":"Character/PENGUIN/06-Jump/02-Jump_Fall.png","cols":5,"rows":1,"max":176,"dx":0.008},
      "jumpthrow": {"src":"Character/PENGUIN/06-Jump/03-Jump_Throw.png","cols":4,"rows":2,"max":176,"dx":-0.027},
      "hurt": {"src":"Character/PENGUIN/07-Hurt/01-Hurt.png","cols":3,"rows":2,"max":176,"dx":0.023,"dy":-0.004},
      "dizzy": {"src":"Character/PENGUIN/07-Hurt/02-Hurt_Dizzy.png","cols":5,"rows":2,"max":176,"dx":-0.01,"dy":0.004},
      "dead": {"src":"Character/PENGUIN/08-Dead/08-Dead.png","cols":5,"rows":2,"max":176,"dx":-0.107,"dy":-0.008}
    } },
    "Piggy": { "extra": {
      "walk": {"src":"Character/PIGGY/03-Walk/03-Walk.png","cols":4,"rows":3,"max":176,"stride":0.681},
      "idle": {"src":"Character/PIGGY/01-Idle/02-Idle_Blink.png","cols":4,"rows":3,"max":176,"fps":10,"dx":0.004},
      "attack": {"src":"Character/PIGGY/02-Throw/02-Throw.png","cols":4,"rows":2,"max":176,"fps":12.5,"scale":0.974,"dx":0.018},
      "run": {"src":"Character/PIGGY/04-Run/04-Run.png","cols":5,"rows":2,"max":176,"scale":0.979,"dx":0.004,"dy":0.02},
      "jumpup": {"src":"Character/PIGGY/06-Jump/01-Jump_Up.png","cols":5,"rows":1,"max":176,"dx":0.002},
      "jumpfall": {"src":"Character/PIGGY/06-Jump/02-Jump_Fall.png","cols":5,"rows":1,"max":176,"dx":-0.002},
      "jumpthrow": {"src":"Character/PIGGY/06-Jump/03-Jump_Throw.png","cols":4,"rows":2,"max":176,"dx":-0.033},
      "hurt": {"src":"Character/PIGGY/07-Hurt/01-Hurt.png","cols":3,"rows":2,"max":176,"dx":0.043},
      "dizzy": {"src":"Character/PIGGY/07-Hurt/02-Hurt_Dizzy.png","cols":5,"rows":2,"max":176,"dx":-0.016},
      "dead": {"src":"Character/PIGGY/08-Dead/08-Dead.png","cols":5,"rows":2,"max":176,"dx":-0.102}
    } },
    "Polar": { "extra": {
      "walk": {"src":"Character/POLAR/03-Walk/03-Walk.png","cols":4,"rows":3,"max":176,"stride":0.711},
      "idle": {"src":"Character/POLAR/01-Idle/02-Idle_Blink.png","cols":4,"rows":3,"max":176,"fps":10,"scale":0.995,"dx":-0.002},
      "attack": {"src":"Character/POLAR/02-Throw/02-Throw.png","cols":4,"rows":2,"max":176,"fps":12.5,"scale":0.99,"dx":0.004},
      "run": {"src":"Character/POLAR/04-Run/04-Run.png","cols":5,"rows":2,"max":176,"dx":0.004,"dy":0.016},
      "jumpup": {"src":"Character/POLAR/06-Jump/01-Jump_Up.png","cols":5,"rows":1,"max":176,"dx":0.006},
      "jumpfall": {"src":"Character/POLAR/06-Jump/02-Jump_Fall.png","cols":5,"rows":1,"max":176,"dx":-0.006},
      "jumpthrow": {"src":"Character/POLAR/06-Jump/03-Jump_Throw.png","cols":4,"rows":2,"max":176,"dx":-0.033},
      "hurt": {"src":"Character/POLAR/07-Hurt/01-Hurt.png","cols":3,"rows":2,"max":176,"dx":0.025},
      "dizzy": {"src":"Character/POLAR/07-Hurt/02-Hurt_Dizzy.png","cols":5,"rows":2,"max":176,"dx":-0.012},
      "dead": {"src":"Character/POLAR/08-Dead/08-Dead.png","cols":5,"rows":2,"max":176,"dx":-0.11}
    } },
    "Reindeer": { "extra": {
      "walk": {"src":"Character/REINDEER/03-Walk/03-Walk.png","cols":4,"rows":3,"max":176,"stride":0.554},
      "idle": {"src":"Character/REINDEER/01-Idle/02-Idle_Blink.png","cols":4,"rows":3,"max":176,"fps":10},
      "attack": {"src":"Character/REINDEER/02-Throw/02-Throw.png","cols":4,"rows":2,"max":176,"fps":12.5,"scale":0.97,"dx":0.01},
      "run": {"src":"Character/REINDEER/04-Run/04-Run.png","cols":5,"rows":2,"max":176,"scale":0.994,"dx":0.008,"dy":0.012},
      "jumpup": {"src":"Character/REINDEER/06-Jump/01-Jump_Up.png","cols":5,"rows":1,"max":176,"dx":0.002},
      "jumpfall": {"src":"Character/REINDEER/06-Jump/02-Jump_Fall.png","cols":5,"rows":1,"max":176,"dx":0.016},
      "jumpthrow": {"src":"Character/REINDEER/06-Jump/03-Jump_Throw.png","cols":4,"rows":2,"max":176,"dx":-0.039},
      "hurt": {"src":"Character/REINDEER/07-Hurt/01-Hurt.png","cols":3,"rows":2,"max":176,"dx":0.043},
      "dizzy": {"src":"Character/REINDEER/07-Hurt/02-Hurt_Dizzy.png","cols":5,"rows":2,"max":176,"dx":-0.02},
      "dead": {"src":"Character/REINDEER/08-Dead/08-Dead.png","cols":5,"rows":2,"max":176,"dx":-0.102,"dy":-0.102}
    } },
    "Tanuki": { "extra": {
      "walk": {"src":"Character/TANUKI/03-Walk/03-Walk.png","cols":4,"rows":3,"max":176,"stride":0.699},
      "idle": {"src":"Character/TANUKI/01-Idle/01-Idle.png","cols":4,"rows":3,"max":176,"fps":10,"dx":-0.002},
      "attack": {"src":"Character/TANUKI/02-Throw/02-Throw.png","cols":4,"rows":2,"max":176,"fps":12.5,"scale":0.979},
      "run": {"src":"Character/TANUKI/04-Run/04-Run.png","cols":5,"rows":2,"max":176,"dy":0.016},
      "jumpup": {"src":"Character/TANUKI/06-Jump/01-Jump_Up.png","cols":5,"rows":1,"max":176,"dx":0.006},
      "jumpfall": {"src":"Character/TANUKI/06-Jump/02-Jump_Fall.png","cols":5,"rows":1,"max":176,"dx":0.01},
      "jumpthrow": {"src":"Character/TANUKI/06-Jump/03-Jump_Throw.png","cols":4,"rows":2,"max":176,"dx":-0.023},
      "hurt": {"src":"Character/TANUKI/07-Hurt/01-Hurt.png","cols":3,"rows":2,"max":176,"dx":0.016},
      "dizzy": {"src":"Character/TANUKI/07-Hurt/02-Hurt_Dizzy.png","cols":5,"rows":2,"max":176,"dx":-0.008},
      "dead": {"src":"Character/TANUKI/08-Dead/08-Dead.png","cols":5,"rows":2,"max":176,"dx":-0.086}
    } },
    "Teddy": { "extra": {
      "walk": {"src":"Character/TEDDY/03-Walk/03-Walk.png","cols":4,"rows":3,"max":176,"stride":0.711},
      "idle": {"src":"Character/TEDDY/01-Idle/02-Idle_Blink.png","cols":4,"rows":3,"max":176,"fps":10,"scale":0.995,"dx":-0.002},
      "attack": {"src":"Character/TEDDY/02-Throw/02-Throw.png","cols":4,"rows":2,"max":176,"fps":12.5,"scale":0.99,"dx":0.004},
      "run": {"src":"Character/TEDDY/04-Run/04-Run.png","cols":5,"rows":2,"max":176,"dx":0.004,"dy":0.016},
      "jumpup": {"src":"Character/TEDDY/06-Jump/01-Jump_Up.png","cols":5,"rows":1,"max":176,"dx":0.006},
      "jumpfall": {"src":"Character/TEDDY/06-Jump/02-Jump_Fall.png","cols":5,"rows":1,"max":176,"dx":-0.006},
      "jumpthrow": {"src":"Character/TEDDY/06-Jump/03-Jump_Throw.png","cols":4,"rows":2,"max":176,"dx":-0.033},
      "hurt": {"src":"Character/TEDDY/07-Hurt/01-Hurt.png","cols":3,"rows":2,"max":176,"dx":0.025},
      "dizzy": {"src":"Character/TEDDY/07-Hurt/02-Hurt_Dizzy.png","cols":5,"rows":2,"max":176,"dx":-0.012},
      "dead": {"src":"Character/TEDDY/08-Dead/08-Dead.png","cols":5,"rows":2,"max":176,"dx":-0.11}
    } }
  }
};
