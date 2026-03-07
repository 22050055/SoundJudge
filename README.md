# 🎵 SoundJudge — Nền tảng đánh giá âm nhạc

## Cấu trúc thư mục đầy đủ

```
music-platform/
│
├── backend/                          ← Server Node.js/Express
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 ← Kết nối MongoDB
│   │   │   └── cloudinary.js         ← Cấu hình lưu file nhạc/ảnh
│   │   │
│   │   ├── models/                   ← Schemas MongoDB
│   │   │   ├── User.js               ← Model người dùng (artist/reviewer/admin)
│   │   │   ├── Track.js              ← Model bài nhạc
│   │   │   └── Review.js             ← Model đánh giá (5 tiêu chí)
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.js               ← Xác thực JWT + phân quyền theo role
│   │   │
│   │   ├── controllers/              ← Logic nghiệp vụ
│   │   │   ├── auth.controller.js    ← Đăng ký, đăng nhập, lấy thông tin user
│   │   │   ├── track.controller.js   ← Upload, lấy danh sách, xóa, thống kê
│   │   │   ├── review.controller.js  ← Gửi review, duyệt, Rating Engine
│   │   │   └── admin.controller.js   ← Thống kê, quản lý user/track
│   │   │
│   │   ├── routes/                   ← Định nghĩa API endpoints
│   │   │   ├── auth.routes.js        ← POST /api/auth/register, /login, GET /me
│   │   │   ├── track.routes.js       ← CRUD /api/tracks
│   │   │   ├── review.routes.js      ← CRUD /api/reviews
│   │   │   └── admin.routes.js       ← /api/admin/*
│   │   │
│   │   └── app.js                    ← Entry point: Express app + Swagger
│   │
│   ├── .env.example                  ← Mẫu biến môi trường
│   └── package.json
│
└── frontend/                         ← Client React.js (Vite)
    ├── index.html                    ← HTML gốc, import font Playfair + DM Sans
    ├── vite.config.js                ← Config Vite + proxy /api → localhost:5000
    ├── package.json
    │
    └── src/
        ├── main.jsx                  ← Entry point React + global styles
        ├── App.jsx                   ← Router chính (React Router v6)
        │
        ├── api/
        │   └── axios.js              ← Axios instance + interceptors (token, 401)
        │
        ├── context/
        │   └── AuthContext.jsx       ← Global auth state (user, login, logout)
        │
        ├── pages/
        │   └── AuthPages.jsx         ← Trang đăng nhập + đăng ký
        │
        └── components/
            ├── common/
            │   ├── Navbar.jsx        ← Thanh điều hướng (thay đổi theo role)
            │   ├── MusicPlayer.jsx   ← Trình phát nhạc tích hợp
            │   └── ProtectedRoute.jsx← Bảo vệ route (yêu cầu đăng nhập/role)
            │
            ├── artist/
            │   ├── ArtistDashboard.jsx ← Grid hiển thị kho nhạc + badge trạng thái
            │   ├── UploadTrack.jsx     ← Form upload nhạc + ảnh bìa
            │   └── TrackStats.jsx      ← Biểu đồ radar + danh sách reviews
            │
            ├── reviewer/
            │   ├── ReviewerWorkspace.jsx ← Sidebar bài chờ + khu vực nghe/chấm
            │   └── RatingForm.jsx        ← Form 5 tiêu chí + thanh trượt
            │
            └── admin/
                └── AdminDashboard.jsx   ← Stats tổng quan + duyệt review + quản lý user
```

---

## Luồng nghiệp vụ chính

```
Artist upload → [pending]
     ↓
Reviewer chọn bài → nghe → chấm điểm 5 tiêu chí → gửi review → [reviewing]
     ↓
Admin duyệt review → Rating Engine tính điểm tổng hợp → Reviewer +5 điểm uy tín
     ↓
Sau 3 review được duyệt → Track [completed] → Artist xem báo cáo đầy đủ
```

## API Endpoints tóm tắt

| Method | Endpoint                        | Role       | Mô tả                        |
|--------|---------------------------------|------------|------------------------------|
| POST   | /api/auth/register              | Public     | Đăng ký tài khoản            |
| POST   | /api/auth/login                 | Public     | Đăng nhập                    |
| GET    | /api/auth/me                    | Any        | Thông tin user hiện tại      |
| POST   | /api/tracks                     | Artist     | Upload bài nhạc              |
| GET    | /api/tracks                     | Any        | Danh sách bài nhạc           |
| GET    | /api/tracks/:id/stats           | Artist     | Thống kê chi tiết bài nhạc   |
| POST   | /api/reviews                    | Reviewer   | Gửi đánh giá                 |
| GET    | /api/reviews/pending            | Admin      | Danh sách review chờ duyệt   |
| PATCH  | /api/reviews/:id/approve        | Admin      | Duyệt review + cập nhật điểm |
| GET    | /api/admin/stats                | Admin      | Thống kê tổng quan           |
| PATCH  | /api/admin/users/:id/toggle     | Admin      | Khóa/mở tài khoản            |
| GET    | /api/docs                       | Public     | Swagger UI                   |

## Cài đặt & Chạy

### Backend
```bash
cd backend
npm install
cp .env.example .env   # điền thông tin MongoDB + Cloudinary
npm run dev            # chạy tại http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # chạy tại http://localhost:5173
```
