# 🎵 SoundJudge — Nền tảng Đánh giá m nhạc (Community Platform)

SoundJudge là một nền tảng âm nhạc mở được xây dựng dựa trên nguyên tắc **cộng đồng**. Mọi người dùng đều có thể tự do tải lên các sáng tác cá nhân, nghe và đánh giá âm nhạc của những thành viên khác thông qua hệ thống tiêu chí chuyên môn, từ đó xây dựng uy tín và kết nối trong cộng đồng yêu nhạc.

### 🌐 Demo Trực tuyến
- **Frontend:** [https://soundjudge.pages.dev](https://soundjudge.pages.dev)
- **Backend API:** [https://soundjudge-backend.onrender.com/api](https://soundjudge-backend.onrender.com/api)

---

## 🛠 Công nghệ Sử dụng (Tech Stack)

### Frontend
- **React.js** (Vite)
- **React Router Dom** (Điều hướng)
- **Axios** (Kết nối API)
- **Chart.js / React-Chartjs-2** (Biểu đồ Radar/Spider Chart)
- **CSS Modules / Vanilla CSS** (Giao diện tùy chỉnh)

### Backend
- **Node.js & Express**
- **MongoDB & Mongoose** (Cơ sở dữ liệu NoSQL)
- **JSON Web Token (JWT)** (Xác thực & Bảo mật)
- **Cloudinary** (Lưu trữ file âm thanh và hình ảnh)
- **Multer** (Xử lý upload file)

---

## ✨ Tính năng Chính

### 👤 Cho Người dùng (User)
- **Quản lý Hồ sơ:** Cập nhật thông tin cá nhân, ảnh đại diện.
- **Tải lên Nhạc:** Đăng tải bài hát (.mp3) kèm ảnh bìa lên Cloudinary.
- **Đánh giá Chuyên môn:** Đánh giá bài hát của người khác theo 5 tiêu chí: Giai điệu, Lời nhạc, Hòa âm, Nhịp điệu, Sản xuất.
- **Biểu đồ Radar:** Hiển thị thống kê điểm số trực quan qua biểu đồ mạng nhện.
- **Theo dõi (Follow):** Kết nối và nhận thông báo từ các nghệ sĩ yêu thích.
- **Hệ thống Thông báo:** Nhận thông tin khi có người đánh giá nhạc hoặc theo dõi mình.

### 🌎 Cho Khách (Guest)
- **Khám phá:** Nghe nhạc trực tuyến không cần đăng nhập.
- **Xem Thống kê:** Xem điểm số và nhận xét công khai của các bài hát.

### 🛠 Cho Quản trị viên (Admin)
- **Quản lý Người dùng:** Khóa/Mở khóa tài khoản vi phạm.
- **Kiểm duyệt Nội dung:** Xử lý các báo cáo (Reports) từ cộng đồng, gỡ bỏ nhạc vi phạm quy chuẩn.
- **Bảng điều khiển (Dashboard):** Thống kê tổng quan về hệ thống.

---

## 📂 Cấu trúc Thư mục

```text
SoundJudge/
├── backend/                          ← Server Node.js/Express
│   ├── src/
│   │   ├── config/                   ← Cấu hình hệ thống
│   │   │   ├── db.js                 ← Kết nối MongoDB
│   │   │   └── cloudinary.js         ← Cấu hình Cloudinary (Audio/Images)
│   │   ├── controllers/              ← Xử lý logic nghiệp vụ
│   │   │   ├── admin.controller.js   ← Quản trị hệ thống & Báo cáo
│   │   │   ├── auth.controller.js    ← Đăng ký, Đăng nhập, JWT
│   │   │   ├── track.controller.js   ← Quản lý bài hát & Upload
│   │   │   ├── review.controller.js  ← Đánh giá & Spider Chart
│   │   │   └── follow.controller.js  ← Theo dõi nghệ sĩ
│   │   ├── middleware/               ← Kiểm soát truy cập
│   │   │   └── auth.js               ← Middleware xác thực & Phân quyền
│   │   ├── models/                   ← Schema dữ liệu (Mongoose)
│   │   │   ├── User.js, Track.js     ← Người dùng & Bài hát
│   │   │   ├── Review.js, Report.js  ← Đánh giá & Báo cáo
│   │   │   └── Notification.js       ← Thông báo hệ thống
│   │   ├── routes/                   ← Định nghĩa API Endpoints
│   │   │   ├── auth.routes.js
│   │   │   ├── track.routes.js
│   │   │   └── admin.routes.js
│   │   └── app.js                    ← Cấu hình Express & Middleware chính
│   ├── createAdmin.js                ← Script tạo Admin khởi tạo
│   └── package.json
└── frontend/                         ← Client React.js (Vite)
    ├── src/
    │   ├── api/                      ← Cấu hình kết nối API
    │   │   └── axiosConfig.js        ← Axios instance & Interceptors
    │   ├── components/
    │   │   ├── common/               ← Components dùng chung
    │   │   │   ├── Navbar.jsx        ← Thanh điều hướng
    │   │   │   ├── MusicPlayer.jsx   ← Trình phát nhạc toàn cục
    │   │   │   ├── RatingForm.jsx    ← Form đánh giá 5 tiêu chí
    │   │   │   └── ReportModal.jsx   ← Modal báo cáo vi phạm
    │   │   ├── user/                 ← Components cho người dùng
    │   │   │   ├── UserDashboard.jsx ← Bảng điều khiển cá nhân
    │   │   │   ├── TrackStats.jsx    ← Biểu đồ Radar thống kê
    │   │   │   └── UploadTrack.jsx   ← Form tải nhạc lên
    │   │   └── admin/
    │   │       └── AdminDashboard.jsx← Quản lý Reports & Users
    │   ├── context/                  ← Quản lý trạng thái toàn cục
    │   │   └── AuthContext.jsx       ← Quản lý phiên đăng nhập
    │   ├── pages/
    │   │   └── AuthPages.jsx         ← Trang Đăng ký / Đăng nhập
    │   ├── App.jsx                   ← Quản lý Routing (React Router)
    │   └── main.jsx                  ← Điểm khởi đầu ứng dụng
    └── package.json
```

---

## 🚀 Cài đặt & Khởi chạy

### 1. File môi trường (.env)

**Backend (`backend/.env`):**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLIENT_URL=http://localhost:5173
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Khởi chạy Backend
```bash
cd backend
npm install
# Tạo tài khoản Admin mặc định (Email: admin@soundjudge.com | Pass: admin123456)
node createAdmin.js 
npm run dev
```

### 3. Khởi chạy Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 👥 Tác giả

Dự án được phát triển bởi nhóm sinh viên:
1. **Đoàn Ngọc Phan Trường** - 22050053
2. **Ngô Mạnh Khang** - 22050055
3. **Lê Quang Đức** - 22050119

---
*Dự án phục vụ mục đích học tập và nghiên cứu công nghệ.*
