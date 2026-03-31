# Haravan Sales Dashboard (Automated)

Bản clone Dashboard báo cáo bán hàng Haravan, hỗ trợ tự động cập nhật dữ liệu từ Google Sheet mỗi tiếng một lần.

## Hướng dẫn cài đặt tự động (GitHub Pages)

Để chạy Dashboard này trên tên miền riêng và tự động cập nhật, bạn hãy làm theo các bước sau:

### 1. Tạo Repository trên GitHub
- Truy cập [github.com](https://github.com) và tạo một Repository mới (ví dụ: `my-sales-dashboard`).
- Upload toàn bộ các file trong thư mục này lên Repo đó (bao gồm cả thư mục `.github`). **Quan trọng: Bạn phải upload file lên trước thì GitHub mới hiện branch 'main' để chọn.**

### 2. Kích hoạt GitHub Pages
- Vào mục **Settings** (biểu tượng bánh răng ở thanh menu trên cùng của Repo).
- Cột bên trái, tìm mục **Pages**.
- Ở phần **Build and deployment**, bạn chọn:
  - **Branch**: Chọn `main`.
  - **Folder**: Chọn `/(root)`. 
- Nhấn nút **Save**.
![Hướng dẫn cài đặt GitHub Pages](file:///C:/Users/admin/.gemini/antigravity/brain/00e7046c-6f0b-4fde-80a8-b9d58b9badef/github_pages_settings_guide_1774945634119.png)
- Chờ khoảng 1-2 phút cho đến khi hiện dòng chữ `Your site is live at...`.

### 3. Gắn Tên miền Cá nhân (Custom Domain)
- Cũng trong mục **Settings** -> **Pages**, tìm phần **Custom domain**.
- Nhập tên miền của bạn vào và làm theo hướng dẫn cấu hình DNS (CNAME) của GitHub.

### 4. Cấu hình Tự động Cập nhật (Sync)
- Dashboard này đã có file `.github/workflows/sync.yml`. 
- GitHub sẽ tự động chạy lệnh tải dữ liệu từ Google Sheet của bạn vào **phút thứ 0 mỗi giờ**.
- Bạn có thể kiểm tra trạng thái tại tab **Actions** trên GitHub.

### Lưu ý quan trọng
- Đảm bảo file Google Sheet của bạn đã được **"Publish to the web"** (Vào File -> Share -> Publish to web -> Chọn định dạng CSV).
- Nếu muốn chạy thủ công trên máy tính, bạn vẫn dùng file `index.html` và file `CapNhatDuLieu.bat` như cũ.

---
*Phát triển bởi Antigravity AI.*
