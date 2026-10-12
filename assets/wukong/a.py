from PIL import Image
import os

def create_sprite_sheet(image_paths, output_path="sprite_sheet.png", cols=6, rows=6):
    # Mở tất cả các ảnh và chuyển đổi sang định dạng RGBA (hỗ trợ trong suốt)
    images = [Image.open(p).convert("RGBA") for p in image_paths]
    
    if not images:
        print("Không tìm thấy ảnh nào!")
        return

    # Lấy kích thước chuẩn từ khung hình đầu tiên
    w, h = images[0].size
    
    # Tạo một ảnh trống lớn chứa toàn bộ sprite sheet
    sheet_width = w * cols
    sheet_height = h * rows
    sprite_sheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))
    
    # Dán từng ảnh nhỏ vào đúng vị trí (hàng, cột) tương ứng trên ảnh lớn
    for index, img in enumerate(images):
        if index >= cols * rows:
            break  # Giới hạn tối đa 36 ảnh (6x6)
            
        # Nếu kích thước ảnh không đồng nhất, resize về chuẩn của ảnh đầu tiên
        if img.size != (w, h):
            img = img.resize((w, h), Image.Resampling.LANCZOS)
            
        col = index % cols
        row = index // cols
        
        # Dán ảnh vào tọa độ tương ứng
        sprite_sheet.paste(img, (col * w, row * h))
        
    # Lưu file kết quả
    sprite_sheet.save(output_path, "PNG")
    print(f"Đã tạo thành công Sprite Sheet và lưu tại: {output_path}")

# === HƯỚNG DẪN SỬ DỤNG ===
# Giả sử bạn có 36 file ảnh được đặt tên từ sprite_1.png đến sprite_36.png trong cùng thư mục:
image_list = [f"sprite_{i}.png" for i in range(1,37)]

# Chạy hàm gộp
create_sprite_sheet(image_list, output_path="pet_walk_spritesheet.png", cols=6, rows=6)
