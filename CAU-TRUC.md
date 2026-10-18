# Cấu trúc code (chia theo vai trò)

Mọi file là script thường (`<script src>`), nạp đúng thứ tự trong `index.html`. Không dùng module nên biến / hàm vẫn dùng chung toàn cục như trước.

## js/config/ – chỉ chứa số liệu, chỉnh ở đây
| File | Nội dung |
|---|---|
| world.js | Kích thước thế giới (CW, CH), vùng đi được, danh sách map (MAPS) |
| pets.js | PET_DEF, PET_ANIM (sprite sheet từng thú), cỡ thú, tốc độ phím, tốc độ cầu lửa |
| decor.js | Ô lưới, loại đường, danh sách vật phẩm |
| battle.js | BATTLE_CFG (số đợt, thưởng…), ENEMY_TYPES (worm + animation), PET_BATTLE (máu / sát thương pet) |

## js/core + js/data
| File | Vai trò |
|---|---|
| core/canvas.js | Canvas chính, đổi tọa độ chuột, bóng đổ |
| data/game-save.js | `state` (xu, cấp) + lưu / tải game |
| data/decor-save.js | Lưu / tải đường + vật phẩm (nạp SAU decor/*) |

## js/assets – nạp ảnh
| File | Vai trò |
|---|---|
| images.js | `IMGS`, `tryImg` (ưu tiên .webp), `runPool`, ảnh nền map |
| sprites.js | Tự nhận lưới sprite sheet, cắt khung (`loadSheet`) |
| pet-loader.js | Nạp thú theo 3 tầng: walk → idle/sleep → skills; `ensureMap` |
| boot.js | Màn hình chờ, `bootAssets`, nạp ngầm phần còn lại |

## js/pets – hành vi thú
| File | Vai trò |
|---|---|
| world.js | `walkable`, `spawnPos`, `initPets`, `PETS` |
| movement.js | `updatePet` / `updateWalker`: đi lang thang, WASD, bấm điểm đến, ngủ |
| skills.js | `triggerAttack`, cầu lửa, vụ nổ, `updateProjectiles` |

## js/input, js/render, js/ui
| File | Vai trò |
|---|---|
| input/keyboard.js | WASD / mũi tên, Enter, `keyDir()` |
| input/pointer.js | Bấm chọn thú, bấm chỗ trống để đi, kéo thú giữa các map |
| render/pet-draw.js | `drawPet`: chọn khung, cân cỡ, bóng, vầng sáng chọn |
| render/fx-draw.js | Điểm đến, cầu lửa, vụ nổ |
| render/scene.js | `drawMapScene`, `drawScene`, `drawOverview` |
| ui/pet-panel.js | Bảng thông tin thú + cho ăn / chơi / ngủ / cất |
| ui/hud.js | Xu / cấp + `toast` |

## js/maps, js/decor, js/menu
| File | Vai trò |
|---|---|
| maps/maps.js | `MAPDATA`, `setActiveMap`, `placePetAt`, chế độ xem toàn bộ |
| decor/core.js | Đối tượng `DECOR`, lớp canvas đường mỗi map |
| decor/paths.js | Vẽ + cọ đường |
| decor/items.js | Vật phẩm, khung chặn thú |
| decor/edit.js | Kéo thả trên canvas khi trang trí |
| decor/ui.js | Thanh công cụ trang trí |
| decor/import.js | Nạp ảnh vật phẩm từ máy |
| menu/menu.js | Nút Chức năng, 3 tab |
| menu/body.js | Thẻ pet / map, `thumbNode` |
| menu/pet-drag.js | Kéo thẻ pet thả vào map |

## js/battle – chế độ chiến đấu
| File | Vai trò |
|---|---|
| state.js | Biến `BT`, `btStat`, chặn lưu game khi đang đánh |
| ui.js | Tạo nút / bảng (kiểu dáng ở css/battle.css), `btFade`, banner |
| prep.js | Đặt pet trước trận: thẻ, kéo thả |
| enemies.js | Sinh địch, AI địch, trừ máu, nổ lan |
| draw.js | Thanh máu + vẽ địch trên canvas phủ |
| flow.js | Vào trận, bắt đầu, `updateBattle`, tổng kết, về phòng chờ |

## js/mobile + js/main.js
| File | Vai trò |
|---|---|
| mobile/layout.js | Nhắc xoay ngang, nút toàn màn hình, class `bt-on` / `bt-fight` |
| mobile/controls.js | Nút ⚔️ + cần di chuyển ảo |
| main.js | Vòng lặp game + khởi động |

## css/
base.css (nền, khung) · hud.css (HUD, toast) · pet-panel.css · menu.css (thanh dưới, thẻ) · battle.css (trước đây nằm trong battle.js) · mobile.css (màn hình nhỏ, cần ảo)

## Muốn sửa gì thì mở file nào
- Đổi số đợt / máu / thưởng / sát thương: `config/battle.js`
- Thêm thú, chỉnh sprite: `config/pets.js`
- Thêm map: `config/world.js`
- Chỉnh khung / tốc độ worm: `config/battle.js` (ENEMY_TYPES)
- Giao diện nút Vào trận / thanh chuẩn bị: `css/battle.css`
- Cần ảo, nút tấn công trên điện thoại: `mobile/controls.js` + `css/mobile.css`
