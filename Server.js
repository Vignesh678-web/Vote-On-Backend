
const dotenv = require("dotenv");
dotenv.config();
const express = require('express');
const cors = require("cors");
const connectDB = require("./config/db");

const StudentRoutes = require("./routes/Student/StudentRoutes")
const teacherRoutes = require('./routes/Teacher/TeacherRoutes');
const teacherAuthRoutes = require('./routes/Teacher/teacherAuthRoutes');
const adminTeacherRoutes = require('./routes/Admin/adminTeacherRoutes');
const adminAuthRoutes = require("./routes/Admin/adminAuthRoutes");
const candidateRoutes = require('./routes/Candidate/candidateRoutes')
const adminCandidateRoutes = require("./routes/Admin/adminCandidateRoutes");


connectDB();

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));


app.use(express.json());

app.use("/api/student", StudentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/teacher/auth',teacherAuthRoutes);
app.use('/api/admin',adminTeacherRoutes);
app.use('/api/admin/auth',adminAuthRoutes);
app.use('/api/candidates', candidateRoutes);
app.use("/api/admin/candidates",adminCandidateRoutes);

app.get("/",(req,res) => {
  res.send("Backend is Working!");
});



app.listen( process.env.PORT||5000, () => console.log(`Server running on port ${process.env.port || 5000}`)
);
