const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const uploadsPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsPath));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsPath);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

let tasks = [
    {
        id: 1,
        title: "Подготовить отчёт по лабораторной работе",
        description: "Описать структуру приложения и добавить скриншоты.",
        status: "in-progress",
        dueDate: "2026-09-20",
        file: null
    },
    {
        id: 2,
        title: "Установить зависимости проекта",
        description: "Установить Express, EJS и Multer.",
        status: "done",
        dueDate: "2026-09-17",
        file: null
    }
];

let nextId = 3;

const statuses = {
    new: "Новая",
    "in-progress": "В работе",
    done: "Выполнена"
};

app.get("/", (req, res) => {
    const selectedStatus = req.query.status || "all";

    const filteredTasks =
        selectedStatus === "all"
            ? tasks
            : tasks.filter(task => task.status === selectedStatus);

    res.render("index", {
        tasks: filteredTasks,
        selectedStatus,
        statuses
    });
});

app.post("/tasks", upload.single("attachment"), (req, res) => {
    const { title, description, status, dueDate } = req.body;

    if (!title || title.trim().length === 0) {
        return res.status(400).send("Название задачи обязательно.");
    }

    const task = {
        id: nextId++,
        title: title.trim(),
        description: description ? description.trim() : "",
        status: statuses[status] ? status : "new",
        dueDate: dueDate || "",
        file: req.file
            ? {
                originalName: req.file.originalname,
                storedName: req.file.filename
            }
            : null
    };

    tasks.push(task);

    res.redirect("/");
});

app.post("/tasks/:id/status", (req, res) => {
    const taskId = Number(req.params.id);
    const task = tasks.find(task => task.id === taskId);

    if (!task) {
        return res.status(404).send("Задача не найдена.");
    }

    if (statuses[req.body.status]) {
        task.status = req.body.status;
    }

    res.redirect(req.get("referer") || "/");
});

app.post("/tasks/:id/delete", (req, res) => {
    const taskId = Number(req.params.id);
    const taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
        return res.status(404).send("Задача не найдена.");
    }

    const task = tasks[taskIndex];

    if (task.file) {
        const filePath = path.join(uploadsPath, task.file.storedName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    tasks.splice(taskIndex, 1);

    res.redirect(req.get("referer") || "/");
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).send("Размер файла не должен превышать 5 МБ.");
        }

        return res.status(400).send(`Ошибка загрузки файла: ${err.message}`);
    }

    next(err);
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});