# Chiến Thú Hỗn Chiến – Khu Vườn Tiến Hóa

Game 2D pixel-art chạy trên trình duyệt: nuôi pet trong khu vườn nhiều map, rồi cho pet vào trận đánh quái theo đợt.
HTML + JavaScript thuần, các file `<script>` thường (không `import/export`, mọi thứ là biến toàn cục), vẽ bằng canvas 2D, không cần build.

Tài liệu này liệt kê đầy đủ tính năng, nơi cài đặt từng tính năng, các thông số chỉnh được và hướng cải tiến, để lần sau mở ra là biết sửa ở đâu.

---

## 1. Chạy game

- Mở qua máy chủ web (Live Server, `python -m http.server`…), **không** mở bằng `file://` (trình duyệt chặn đọc điểm ảnh để cân kích thước, và chặn một số cách nạp ảnh).
- Thư mục `assets/` (ảnh nền, sprite sheet pet, ảnh quái) nằm cạnh `index.html`, không thuộc mã nguồn.
  - Ảnh nền: `assets/background/<id>.webp|png`
  - Pet: `assets/<tên pet viết thường>/walk|idle|sleep|attack|skill1….webp`
  - Quái: đường dẫn khai báo trong `ENEMY_TYPES` (`js/config/battle.js`).
- Có thể đặt ảnh trên máy chủ ngoài (Cloudinary…): chỉ cần đổi đường dẫn `src` / `bg` trong config.

## 2. Cấu trúc thư mục

```
index.html
css/        base · hud · pet-panel · menu · battle · mobile
js/
  config/   world.js   kích thước thế giới, vùng đi, MAPS, khóa lưu
            pets.js    PET_DEF, PET_ANIM, hằng số cỡ và tốc độ
            battle.js  BATTLE_CFG, ENEMY_TYPES, PET_BATTLE
  core/     canvas.js          canvas chính, quy đổi tọa độ chuột, bóng đổ
  data/     game-save.js       state, saveGame / loadGame, savedPet, savedActiveMap
  assets/   images.js          IMGS, tryImg (ưu tiên .webp), runPool, loadBg
            sprites.js         loadSheet: cắt sprite sheet thành khung
            pet-loader.js      nạp 3 tầng cho pet, ensurePet, ensureMap
            boot.js            màn hình chờ, bootAssets, startBackgroundLoad
  pets/     world.js           PETS, walkable, spawnPos, initPets, pSize
            movement.js        updatePet, updateWalker (đi, ngủ, đánh, tới điểm bấm)
            skills.js          triggerAttack, quả cầu bay, vụ nổ
  input/    keyboard.js        WASD / mũi tên, Enter, phím 1
            pointer.js         chọn pet, bấm chỗ trống, kéo pet giữa các map
  render/   pet-draw.js        drawPet
            fx-draw.js         vòng điểm đến, quả cầu, vụ nổ
            scene.js           drawMapScene, drawOverview
  ui/       pet-panel.js       bảng thông tin pet, cho ăn / chơi / ngủ / cất
            hud.js             xu, cấp, toast
  maps/     maps.js            ACTIVE_MAP, setActiveMap, setOverview, placePetAt
  menu/     menu.js            thanh chức năng, tab Pet / Map
            body.js            thẻ pet, thẻ map, thumbNode, renderMenu
            pet-drag.js        kéo thẻ pet thả vào map
  battle/   state.js           BT, btStat
            ui.js              tự chèn nút / thanh / bảng của trận, btFade, btBanner
            pick.js            màn hình chọn pet trước trận
            prep.js            chuẩn bị: đặt / thu hồi pet, btPreload
            enemies.js         quái: sinh, AI, sát thương, nổ lan
            draw.js            thanh máu, thân quái, chữ sát thương
            flow.js            vào trận, vòng cập nhật, tổng kết, thoát
            settings.js        nút ⚙️, tốc độ x1/x2/x4, tự động đánh
  mobile/   layout.js          nhắc xoay ngang, toàn màn hình, class bt-on / bt-fight
            controls.js        nút ⚔️, cần di chuyển ảo
  main.js   vòng lặp game, khởi động
```

**Thứ tự nạp trong `index.html` quan trọng** (vì dùng biến toàn cục):
config → core → data → assets → pets → input → render → ui → maps → menu → battle → mobile → `main.js`.
Hàm chỉ cần có mặt lúc chạy (ví dụ `render/scene.js` gọi `btDrawEnemy` của `battle/`) nên không bị ràng buộc thứ tự, nhưng `const`/`let` ở tầng ngoài phải khai báo trước khi dùng ở tầng ngoài của file khác.

## 3. Tính năng

### 3.1 Khu vườn
| Tính năng | Chi tiết | Nơi cài đặt |
|---|---|---|
| Nhiều map | Mỗi map một ảnh nền (`MAPS`); mọi map chạy liên tục, pet ở map không xem vẫn đi lại | `config/world.js`, `maps/maps.js`, `main.js` |
| Nhớ map đang xem | Lưu `state.activeMap`, mở lại game vào đúng map; map không còn trong `MAPS` thì về map đầu | `data/game-save.js`, `maps/maps.js`, `assets/boot.js` |
| Xem toàn bộ map | Lưới thu nhỏ, kéo pet giữa các map, bấm nhãn tên map để vào | `maps/maps.js`, `render/scene.js`, `input/pointer.js` |
| Menu chức năng | Hai tab: **Pet** (kéo thẻ pet thả vào map, cất về danh sách) và **Map** | `menu/*` |
| Chọn và điều khiển pet | Bấm pet để chọn (vùng bấm hình elip bao cả thân, pet cao vẫn bấm được); WASD / mũi tên đi; bấm chỗ trống để đi tới đó | `input/*`, `pets/movement.js` |
| Tốc độ đi cố định | Giữ phím không đi nhanh hơn đi thường (`KEY_SPEED_WALK`, `KEY_SPEED_OTHER`, nhân `speed` của pet) | `pets/movement.js`, `config/pets.js` |
| Chăm pet | Đói / vui / năng lượng giảm theo thời gian; cho ăn (10 xu), chơi, ngủ, cất; xu +3 mỗi 5 giây; cấp tăng khi chơi | `ui/pet-panel.js`, `main.js` |
| Vùng đi được | Chỉ dùng `WALK_POLY` (đa giác cho phép) và `FORBIDDEN` (các vùng cấm) | `config/world.js`, `pets/world.js` |
| Kích thước cố định | Cỡ pet không đổi theo vị trí; không tự phóng to, thu nhỏ khi đổi trạng thái | `render/pet-draw.js`, `PET_BASE_SIZE` |
| Hào quang khi chọn | Viền sáng ôm theo hình pet | `render/pet-draw.js` |
| Biểu tượng trạng thái | 🍖 đói, 😢 buồn, 💤 ngủ | `render/pet-draw.js` |

### 3.2 Pet và hoạt ảnh
- **Chỉ dùng sprite sheet**, lưới mặc định 6×6 (`SHEET_DEFAULT`). Ô trống ở cuối sheet tự bị bỏ nếu không ghi `frames`. Không còn tự nhận lưới.
- Sheet: `walkSheet` (bắt buộc), `idleSheet`, `sleepSheet`, `attackSheet`, `skill1Sheet`, `skill1BallSheet`, `skill1BlastSheet`, `fireballSheet`, `explosionSheet`.
- Đi bộ chạy theo **quãng đường** (không theo fps): chỉnh bằng `stride` (độ dài bước) và `speed`.
- Mỗi sheet có `scale` riêng; `dx`, `dy` chỉnh vị trí đứng (đơn vị = phần của chiều cao khung; 0 = giữ nguyên). Khi pet quay trái, `dx` tự đảo theo hướng nhìn.
- Hoạt ảnh đứng yên và ngủ chạy lại từ khung 1 mỗi lần vào trạng thái. Sau đòn đánh pet đứng yên 0.25 giây rồi mới đi tiếp.
- Hình mặc định của pet quay phải. Sprite quay trái thì tự lật ảnh sheet trước khi dùng.

### 3.3 Đòn và kỹ năng
| Phím / nút | Hành động | Ghi chú |
|---|---|---|
| Enter, nút ⚔️ | Đòn thường (`attackSheet`) | Pet có `fireballSheet` thì bắn quả cầu lửa tới điểm đích rồi nổ |
| Phím `1` (hàng số trên hoặc bàn phím số) | Skill 1 (`skill1Sheet`) | Có thời gian hồi `cd` (mặc định 5 giây) |

- Skill 1 có `skill1BallSheet`: phóng quả cầu bay (xuất phát tại `ballX`, `ballY`, tốc độ `speed`, bắn ở khung `fireFrame`), nổ ở điểm đến, có thể có hiệu ứng nổ `skill1BlastSheet`.
- Skill 1 không có quả cầu: gây sát thương lan quanh pet ở giữa hoạt ảnh.
- Hệ thống dùng chung `triggerAttack(pet, kind)`; thêm skill mới (`skill2`…) là khai thêm các thuộc tính cùng khuôn `skill1*`.

### 3.4 Trận đánh
Luồng: **bấm ⚔️ Vào trận → màn hình chờ nạp (map chiến đấu, quái, mọi pet) → chọn pet → chuẩn bị → đánh theo đợt → tổng kết → về phòng chờ.**

- **Chọn pet** (`pick.js`): hàng ô trên cùng là pet đã chọn (tối đa `BATTLE_CFG.maxPets`), lưới bên dưới là toàn bộ pet; bấm thẻ để chọn / bỏ.
- **Chuẩn bị** (`prep.js`): pet đã chọn được thả sẵn vào map; kéo thẻ vào map hoặc bấm thẻ để thả / thu hồi.
- **Đợt địch** (`BATTLE_CFG.waves`): mỗi đợt có loại, số lượng, giãn cách; địch trâu thêm `hpGrow` mỗi đợt; nghỉ `waveRest` giây giữa đợt.
- **Quái Sâu Cát** (`ENEMY_TYPES.worm`): chui đi (`travel`) → trồi lên (`emerge`) → cắn (`attack`, trúng ở `hitAt`) → lặn (`dive`).
- **Sát thương**: pet chỉ gây sát thương bằng đòn do người chơi hoặc tự động kích hoạt; quả cầu nổ lan trong `blastRadius`. Chỉ số pet trong `PET_BATTLE` (`hp`, `dmg`, `range`, `cd`).
- **Tự động đánh** (bật mặc định, tắt trong ⚙️): pet **không được chọn** tự nhắm quái gần nhất, đi tới điểm cách quái ~70% tầm đánh (không hiện vòng tròn điểm đến), rồi tung đòn thường, nghỉ `cd` giữa hai đòn. Chọn pet đó hoặc tắt tự động thì pet bỏ đường đi tự động.
- **Nút ⚙️ góc trên phải** (`settings.js`): tốc độ x1 / x2 / x4, công tắc tự động đánh, Tiếp tục, Thoát trận (về phòng chờ, không thưởng). Mở bảng thì trận tạm dừng.
- **Tốc độ x2 / x4**: `main.js` cộng độ lệch `OFS` vào đồng hồ game và chia mỗi khung thành nhiều bước nhỏ để không lỡ va chạm.
- **Xếp lớp**: pet và quái xếp chung theo trục y (ai thấp hơn trên màn hình thì nằm đè lên). Thanh máu và chữ sát thương vẽ trên lớp phủ `#bt-ov`.
- **Thanh máu**: kiểu khung đá, pet màu xanh lá, quái màu đỏ cam; độ cao theo `barDY` (có thể đặt riêng trong `PET_DEF` của từng pet).
- **Kết thúc**: thắng khi hết đợt và hết quái, nhận `reward` xu; thua khi mọi pet gục. Pet gục bị gỡ khỏi map. Bảng tổng kết có thời gian, số quái hạ, sát thương từng pet.
- **Không lưu trong trận**: `saveGame` bị chặn khi `BT.phase !== 'off'`; thoát trận khôi phục map và vị trí pet trước trận.

### 3.5 Nạp ảnh và hiệu năng
- Ưu tiên `.webp` cạnh `.png` (`PREFER_WEBP`).
- Nạp 3 tầng theo nhu cầu: `loadPetWalk` → `loadPetLook` (idle, sleep) → `loadPetSkills` (attack, skill, fireball, explosion).
- Vào game chỉ nạp ảnh nền và pet của map đang mở (màn hình chờ `bootAssets`); phần còn lại nạp ngầm (`startBackgroundLoad`).
- Chỉ giải nén tối đa `LOAD_PARALLEL` sheet cùng lúc.
- Khung được thu nhỏ tối đa `SHEET_DEFAULT.max` px mỗi cạnh để giảm bộ nhớ.

### 3.6 Điện thoại
- Màn hình cảm ứng dọc: lời nhắc xoay ngang (có nút "Vẫn chơi chế độ dọc"); nút toàn màn hình, khóa ngang nếu trình duyệt cho phép.
- Trong trận: ẩn nút Chức năng và bảng pet; hiện cần di chuyển ảo (joystick) và nút ⚔️.
- CSS thu gọn khi màn hình thấp: `css/mobile.css`.

## 4. Các thông số hay chỉnh

| Muốn chỉnh | Sửa ở đâu |
|---|---|
| Thêm / bớt map, map mở đầu | `MAPS` trong `config/world.js` |
| Pet có sẵn ở map đầu hay nằm trong danh sách | `PETS_START_PLACED` |
| Thêm pet, cỡ pet | `PET_DEF` (`name`, `scale`, `barDY`…) trong `config/pets.js` |
| Hoạt ảnh pet | `PET_ANIM[tên]` trong `config/pets.js` |
| Cỡ chung của mọi pet | `PET_BASE_SIZE` (mặc định 100) |
| Tốc độ đi | `KEY_SPEED_WALK`, `KEY_SPEED_OTHER`, `speed` của `walkSheet` |
| Tốc độ / thời gian sống quả cầu | `FIREBALL_SPEED`, `FIREBALL_LIFESPAN` |
| Map chiến đấu, số pet, thưởng, đợt | `BATTLE_CFG` trong `config/battle.js` |
| Loại quái, máu, sát thương, hoạt ảnh | `ENEMY_TYPES` |
| Máu / sát thương / tầm / cd của pet | `PET_BATTLE` (không khai = `PET_BATTLE_DEFAULT`) |
| Khóa lưu localStorage (đổi để reset dữ liệu) | `SAVE` trong `config/world.js` |

**Thuộc tính của một sheet** (viết dạng `{ src: '...', ... }`, mặc định không cần ghi):
`cols`, `rows` (mặc định 6×6), `frames` (mặc định tự đếm), `fps` (idle 12, sleep 6, attack và skill 12.5), `scale` (1), `dx`, `dy` (0), riêng `walkSheet`: `stride`, `speed` (1); riêng `attackSheet`: `fireFrame`; riêng `skill1Sheet`: `cd`, `dmg`, `range`, `reach`, `fireFrame`, `speed`, `ballX`, `ballY`.

## 5. Dữ liệu và trạng thái

- `state` (`data/game-save.js`): `{coins, xp, lv, petsData[], activeMap}`; lưu vào `localStorage[SAVE]`.
- `petsData[i]` lưu theo **id = tên pet**: `{id, hunger, happy, energy, x, y, map}`. Bản lưu cũ lưu theo chỉ số vẫn đọc được (`savedPet`).
- `PETS[]` (`pets/world.js`): mỗi pet có `def`, vị trí `x y`, vận tốc, `map` (null = đang trong danh sách), `selected`, `target`, `isAttacking`, `atkKind`, `attackFrame`, `skillCd`, cờ trận (`bhp`, `bmax`, `bdead`, `btNext`, `_autoGo`…).
- `BT` (`battle/state.js`): pha `off → entering → pick → prep → fight → result → leaving`, danh sách quái, hiệu ứng chữ, `speed`, `auto`, `paused`, `chosen`.
- `VIEW`, `ACTIVE_MAP` (`maps/maps.js`); `MENU` (`menu/menu.js`).

## 6. Vòng lặp và thứ tự vẽ

`main.js`: `frame(ts)` → tính hệ số tốc độ (`btSpeed`) → chia nhỏ khung → `stepGame` (cập nhật mọi pet có `map`, đạn và vụ nổ, trận đánh) → `drawScene` → `requestAnimationFrame`.

`drawMapScene(map)`: nền → pet và quái xếp theo y → vòng điểm đến → quả cầu → vụ nổ. Lớp phủ `#bt-ov` (thanh máu, chữ bay) vẽ sau cùng từ `btDraw`.

## 7. Công cụ

- **Căn dx dy** (`align.html`): trang riêng để nạp từng sheet, xem trước hoạt ảnh, kéo nhân vật so với "ghost" (khung 1 của sheet đi bộ), có nút gợi ý căn chân, đặt điểm phóng (`ballX`, `ballY`), và xuất đoạn cấu hình `PET_ANIM` (chỉ ghi giá trị khác mặc định).

## 8. Lưu ý khi sửa

- Thêm file JS mới: nhớ thêm thẻ `<script>` vào `index.html` đúng thứ tự.
- Gọi hàm trong `battle/` từ nơi khác phải kiểm tra `typeof ... === 'function'` nếu file có thể chưa nạp (xem `render/scene.js`).
- Đổi cấu trúc `state` thì cân nhắc đổi `SAVE` hoặc giữ tương thích với bản lưu cũ.
- Các giá trị `dx`, `dy` tính theo **chiều cao khung đã vẽ**, nên đổi `scale` sheet thì lệch chân đổi theo; căn lại bằng `align.html`.
- Sprite sheet lệch lưới (không phải 6×6) bắt buộc khai `cols`, `rows`.
- Đã gỡ hoàn toàn: tính năng trang trí và vẽ vùng đi (`DECOR`, `MAPDATA`, `renderDeco`…). Nếu thấy tham chiếu còn sót là lỗi.

## 9. Hướng cải tiến gợi ý

- Thêm skill 2, 3 (phím `2`, `3`) bằng cách tổng quát hóa phím và các thuộc tính `skill*`; thêm nút skill trên cảm ứng (hiện chỉ có nút ⚔️).
- Thêm loại quái và đợt mới; quái bay, quái đánh xa; boss cuối đợt.
- Hệ số tốc độ đuổi riêng cho pet khi tự động đánh (hiện dùng tốc độ đi thường).
- Chọn mục tiêu ưu tiên cho tự động đánh (yếu nhất, gần nhất, mạnh nhất).
- Lưu tiến trình (cấp độ, kinh nghiệm) cho từng pet và cho pet cấp cao chỉ số chiến đấu tốt hơn.
- Âm thanh, rung màn hình khi trúng đòn, hiệu ứng khi quái chết.
- Chuyển ảnh lên máy chủ / CDN và dùng một `ASSET_BASE` chung để đổi đường dẫn một chỗ.
- Tách `config/pets.js` thành mỗi pet một file khi số pet lên hàng trăm.
