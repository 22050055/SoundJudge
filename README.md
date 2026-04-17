# 🎵 SoundJudge — Nền tảng Đánh giá m nhạc (Community Platform)

SoundJudge là một nền tảng âm nhạc mở được xây dựng dựa trên nguyên tắc **cộng đồng**. Mọi người dùng đều có thể tự do tải lên các sáng tác cá nhân, nghe và đánh giá âm nhạc của những thành viên khác, nhận xét chi tiết thông qua các tiêu chí chuyên môn và xây dựng uy tín cá nhân trên nền tảng.

### 🌐 Demo Trực tuyến
- **Frontend:** [https://soundjudge.pages.dev](https://soundjudge.pages.dev)
- **Backend API:** [https://soundjudge-backend.onrender.com/api](https://soundjudge-backend.onrender.com/api)

---

## 📂 Cơ sở hạ tầng (Cấu trúc thư mục)

```text
SoundJudge/
│
├── backend/                          ← Server Node.js/Express
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 ← Kết nối MongoDB
│   │   │   └── cloudinary.js         ← Cấu hình lưu file nhạc/ảnh
│   │   │
│   │   ├── models/                   ← Schemas MongoDB (User, Track, Review, Report, Notification)
│   │   ├── middleware/
│   │   │   └── auth.js               ← Xác thực JWT + Phân quyền (Guest/User/Admin)
│   │   ├── controllers/              ← Logic nghiệp vụ (Auth, Track, Review, Follow, Admin)
│   │   ├── routes/                   ← Định nghĩa API endpoints (Gắn middleware bảo mật)
│   │   └── app.js                    ← Entry point: Express app (CORS, JSON, Routes setup)
│   └── package.json
│
└── frontend/                         ← Client React.js (Vite)
    ├── src/
    │   ├── main.jsx                  ← Entry point React
    │   ├── App.jsx                   ← Master router (Quản lý User & Admin)
    │   ├── api/                      ← Cấu hình Axios & API URL
    │   ├── context/                  ← Global state (AuthContext)
    │   ├── components/
    │   │   ├── common/               ← Navbar, RatingForm, ReportModal
    │   │   ├── user/                 ← Dashboard, Profile, Upload, TrackStats (Spider Chart)
    │   │   └── admin/                ← Admin Dashboard (Manage Reports, Users)
    │   └── pages/                    ← AuthPages (Login/Register)
```

---

## 🔄 Luồng Nghiệp vụ Cộng đồng (Workflow)

```text
1. TIẾP CẬN MỞ (Public Access)
Khách (Guest) truy cập trang web → Nghe nhạc trực tuyến và xem thống kê bài nhạc công khai.
     ↓
2. TẢI NHẠC & TƯƠNG TÁC
User đăng ký/đăng nhập → Tải nhạc lên (mặc định [published]) và đánh giá (Rating) bài nhạc của người khác.
     ↓
3. HỆ THỐNG ĐIỂM & UY TÍN
Số điểm (1-10) từ 5 tiêu chí chuyên môn (Giai điệu, Lời nhạc, Hòa âm, Nhịp điệu, Sản xuất) 
được tổng hợp thành biểu đồ Radar (Spider Chart). User nhận Reputation khi có đánh giá chuyên sâu.
     ↓
4. QUẢN TRỊ & BÁO CÁO
Nội dung vi phạm có thể bị Báo cáo bởi bất kỳ ai. Admin xem xét thủ công để hạ bài nhạc hoặc khóa tài khoản.
```

## 🔌 API Endpoints nổi bật

| Method | Endpoint                        | Quyền truy cập | Mô tả                                    |
|--------|---------------------------------|--------------|------------------------------------------|
| POST   | /api/auth/register              | Public       | Đăng ký tài khoản (Mặc định: user)       |
| GET    | /api/auth/me                    | User         | Lấy thông tin cá nhân hiện tại           |
| POST   | /api/tracks                     | User         | Đăng nhạc mới (kèm file .mp3 & ảnh bìa)  |
| GET    | /api/tracks                     | Public       | Khám phá kho nhạc cộng đồng              |
| GET    | /api/tracks/:id/stats           | Public       | Xem biểu đồ điểm & Nhận xét chi tiết     |
| POST   | /api/reviews                    | User         | Gửi đánh giá chuyên môn (min 10 ký tự)   |
| POST   | /api/users/:id/follow           | User         | Theo dõi Artist yêu thích                |
| PATCH  | /api/admin/reports/:id/resolve  | Admin        | Admin xử lý báo cáo vi phạm              |

## 🚀 Cài đặt & Chạy (Environment Setups)

### 1. File môi trường (.env)

**Backend (`backend/.env`):**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=http://localhost:5173
```

**Frontend (`frontend/.env` - tạo file này):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Khởi chạy Backend
```bash
cd backend
npm install
npm run dev # Chạy tại http://localhost:5000
```

### 3. Khởi chạy Frontend
```bash
cd frontend
npm install
npm run dev # Truy cập Web tại http://localhost:5173
```
