# 🎵 SoundJudge — Nền tảng Đánh giá m nhạc (Community Platform)

SoundJudge là một nền tảng âm nhạc mở được xây dựng dựa trên nguyên tắc **cộng đồng**. Mọi người dùng đều có thể tự do tải lên các sáng tác cá nhân, nghe và đánh giá âm nhạc của những thành viên khác, nhận xét chi tiết thông qua các tiêu chí chuyên môn và xây dựng uy tín cá nhân trên nền tảng.

---

## 📂 Cơ sở hạ tầng (Cấu trúc thư mục)

```text
music-platform/
│
├── backend/                          ← Server Node.js/Express
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 ← Kết nối MongoDB
│   │   │   └── cloudinary.js         ← Cấu hình lưu file nhạc/ảnh
│   │   │
│   │   ├── models/                   ← Schemas MongoDB
│   │   │   ├── User.js               ← Model người dùng (hỗ trợ role, followers/following, báo cáo)
│   │   │   ├── Track.js              ← Model bài nhạc (hỗ trợ báo cáo vi phạm)
│   │   │   ├── Review.js             ← Model đánh giá (5 tiêu chí)
│   │   │   └── Report.js             ← Model hệ thống báo cáo vi phạm tập trung
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.js               ← Xác thực JWT + phân quyền (user/admin)
│   │   │
│   │   ├── controllers/              ← Logic nghiệp vụ
│   │   │   ├── auth.controller.js    ← Đăng ký, đăng nhập
│   │   │   ├── track.controller.js   ← Upload, lấy danh sách nhạc, lấy thông tin cá nhân
│   │   │   ├── review.controller.js  ← Chấm bài, lấy danh sách đánh giá
│   │   │   ├── follow.controller.js  ← Thao tác follow / unfollow người dùng
│   │   │   ├── report.controller.js  ← Nơi xử lý gửi báo cáo vi phạm
│   │   │   └── admin.controller.js   ← Resolve report, xóa review, đóng băng tài khoản (admin)
│   │   │
│   │   ├── routes/                   ← Định nghĩa API endpoints
│   │   │   └── ... (chia theo tính năng logic)
│   │   │
│   │   ├── scripts/
│   │   │   └── migrate-roles.js      ← Cập nhật schema khi chuyển sang mô hình Community
│   │   │
│   │   └── app.js                    ← Entry point: Express app + Swagger
│   │
│   └── package.json
│
└── frontend/                         ← Client React.js (Vite)
    ├── src/
    │   ├── main.jsx                  ← Entry point React
    │   ├── App.jsx                   ← Master router (Quản lý User & Admin)
    │   │
    │   ├── api/
    │   │   └── axiosConfig.js        ← Cấu hình Axios request & intercept 401
    │   │
    │   ├── context/
    │   │   └── AuthContext.jsx       ← Global auth state
    │   │
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── Navbar.jsx        ← Thanh điều hướng (Profile Link, Auth, Badge)
    │   │   │   ├── RatingForm.jsx    ← Component module chấm điểm 5 tiêu chí
    │   │   │   └── ReportModal.jsx   ← Modal báo cáo tập trung (Tái sử dụng)
    │   │   │
    │   │   ├── user/
    │   │   │   ├── UserDashboard.jsx ← (🌐 Khám phá, 🎧 Nhạc của tôi, 💬 Review của tôi)
    │   │   │   ├── ProfilePage.jsx   ← Trang thành viên (Follow / Reputation score)
    │   │   │   ├── UploadTrack.jsx   ← Tải nhạc (upload)
    │   │   │   └── TrackStats.jsx    ← Hiển thị chi tiết và đồ thị màng nhện (Radar Chart)
    │   │   │
    │   │   └── admin/
    │   │       └── AdminDashboard.jsx ← Tích hợp (Overview, Manage Users, Reviews, Reports)
    │   │
    │   └── pages/
    │       └── AuthPages.jsx         ← Layout Register & Login (Dành cho nền tảng mở)
```

---

## 🔄 Luồng Nghiệp vụ Cộng đồng (Workflow)

```text
1. BẤT QUẢN LÍ
User 1 tải nhạc lên hệ thống → Trạng thái bài hát mặc định là [published] (Đã xuất bản).
     ↓
2. TƯƠNG TÁC XÃ HỘI
User 2 nghe và đánh giá (Rating) bài nhạc qua form 5 tiêu chí.
Review này được tự động cập nhật hệ thống là [approved] → User 2 nhận điểm Uy tín (Reputation).
     ↓
3. HIỂN THỊ
User 1 vào trang Thống Kê (TrackStats) để xem radar chart và kiểm tra điểm từ User 2.
User 1 có thể Follow User 2 trên nền tảng mở.
     ↓
4. BÁO CÁO & QUẢN TRỊ
Nếu Track hoặc Review vi phạm (Spam/Copyright), một User bất kì có thể ấn Báo cáo (Report).
Admin nhận thông báo trên Dashboard → Đánh giá vi phạm → Tiêu hủy nội dung (nếu có).
```

## 🔌 API Endpoints nổi bật

| Method | Endpoint                        | Role       | Mô tả                        |
|--------|---------------------------------|------------|------------------------------|
| POST   | /api/auth/register              | Public     | Đăng ký tài khoản (Mặc định Role: user) |
| GET    | /api/auth/me                    | Lợi ích      | Thông tin user theo Cookie Token |
| POST   | /api/tracks                     | User       | Đăng nhạc                    |
| GET    | /api/tracks                     | Any        | Tìm kiếm, Query kho nhạc     |
| GET    | /api/tracks/:id/stats           | Any        | Render điểm Radar             |
| POST   | /api/reviews                    | User       | Submitting bài đánh giá 5 tiêu chí |
| POST   | /api/users/:id/follow           | User       | Follow User                  |
| POST   | /api/tracks/:id/report          | User       | Report báo cáo hệ thống               |
| PATCH  | /api/admin/reports/:id/resolve  | Admin      | Admin phán quyết Report      |

## 🚀 Cài đặt & Chạy (Environment Setups)

### 1. File môi trường (.env)
Để cả hệ thống hoạt động, hãy thiết lập biến môi trường ở mục `backend/.env`. (Đã được tạo sẵn theo Cluster Setup).

### 2. Khởi chạy Backend (Node/Express)
Mở Terminal, di chuyển tới thư mục `backend`:
```bash
cd backend
npm install
node src/scripts/migrate-roles.js   # (Setup array cho DB)
npm run dev                         # chạy lại tại http://localhost:5000
```

### 3. Khởi chạy Frontend (React/Vite)
Mở thêm một panel Terminal mới, di chuyển về Frontend:
```bash
cd frontend
npm install
npm run dev                         # truy cập Giao diện Web: http://localhost:5173
```
