require('dotenv').config(); // Menggunakan dotenv untuk mengelola variabel lingkungan

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Menyajikan file statis dari folder uploads

// Koneksi ke MongoDB
mongoose.connect(process.env.MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB terhubung'))
.catch(err => console.error('Kesalahan koneksi MongoDB:', err));

// Setup Multer untuk menangani upload gambar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Pastikan folder ini ada di direktori server
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Menambahkan timestamp untuk menghindari nama file yang sama
    }
});

const upload = multer({ storage });

// Definisikan schema dan model
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    submissionDate: { type: Date },
    image: { type: String },
    completed: { type: Boolean, default: false },
});

const Task = mongoose.model('Task', taskSchema);

// API routes
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (err) {
        console.error('Kesalahan saat mengambil tugas:', err);
        res.status(500).json({ message: 'Kesalahan saat mengambil tugas' });
    }
});

app.post('/tasks', upload.single('image'), async (req, res) => {
    // Validasi input
    const { title, subject, description, dueDate } = req.body;
    if (!title || !subject || !description || !dueDate) {
        return res.status(400).json({ message: 'Judul, subjek, deskripsi, dan tanggal jatuh tempo diperlukan.' });
    }

    const newTask = new Task({
        title,
        subject,
        description,
        dueDate: new Date(dueDate),
        submissionDate: req.body.submissionDate ? new Date(req.body.submissionDate) : undefined,
        image: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null
    });

    try {
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        console.error('Kesalahan saat menyimpan tugas:', err);
        res.status(400).json({ message: 'Kesalahan saat menyimpan tugas', error: err.message });
    }
});

app.put('/tasks/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;

    // Validasi ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Format ID tidak valid' });
    }

    const updateData = {
        title: req.body.title,
        subject: req.body.subject,
        description: req.body.description,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        submissionDate: req.body.submissionDate ? new Date(req.body.submissionDate) : undefined,
        image: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : undefined // Hanya mengganti jika ada gambar baru
    };
    
    try {
        const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updatedTask) return res.status(404).json({ message: 'Tugas tidak ditemukan' });
        res.json(updatedTask);
    } catch (err) {
        console.error('Kesalahan saat memperbarui tugas:', err);
        res.status(400).json({ message: 'Kesalahan saat memperbarui tugas' });
    }
});

app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    console.log("Mencoba menghapus tugas dengan ID:", id);

    // Validasi ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('ID tidak valid');
        return res.status(400).json({ message: 'Format ID tidak valid' });
    }

    try {
        const deletedTask = await Task.findByIdAndDelete(id);
        if (!deletedTask) {
            console.log('Tugas tidak ditemukan');
            return res.status(404).json({ message: 'Tugas tidak ditemukan' });
        }
        res.status(204).send(); // Mengembalikan status 204 untuk menandakan sukses tanpa konten
    } catch (err) {
        console.error('Kesalahan saat menghapus tugas:', err);
        res.status(500).json({ message: 'Kesalahan saat menghapus tugas' });
    }
});

app.put('/tasks/:id/complete', async (req, res) => {
    const { id } = req.params;

    // Validasi ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Format ID tidak valid' });
    }

    try {
        const task = await Task.findByIdAndUpdate(id, { completed: req.body.completed }, { new: true });
        if (!task) return res.status(404).json({ message: 'Tugas tidak ditemukan' });
        res.json(task);
    } catch (err) {
        console.error('Kesalahan saat menandai tugas sebagai selesai:', err);
        res.status(400).json({ message: 'Kesalahan saat menandai tugas sebagai selesai' });
    }
});

// Middleware penanganan kesalahan
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Sesuatu yang salah!');
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan pada port ${PORT}`);
});
