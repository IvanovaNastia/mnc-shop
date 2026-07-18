import sqlite3
import json
import shutil
import os
from datetime import datetime
import urllib.request
import urllib.parse
from typing import List, Dict, Optional
from io import BytesIO
from PIL import Image

# fastapi импорты
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Библиотека для чтения файлов настроек .env
from dotenv import load_dotenv

# Загружаем переменные из файла .env (если он есть в папке)
load_dotenv()

# Читаем секретный пароль из файла .env
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError("КРИТИЧЕСКАЯ ОШИБКА: Переменная ADMIN_PASSWORD не задана в файле .env!")

app = FastAPI()

# Настройка CORS, чтобы фронтенд мог делать запросы к бэкенду
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "store.db"
JSON_PATH = "products.json"

# --- ФУНКЦИЯ ПРОВЕРКИ ПАРОЛЯ (ЗАВИСИМОСТЬ) ---
def verify_admin_password(x_admin_password: str = Header(None, alias="X-Admin-Password")):
    """Безопасная проверка токена авторизации в заголовках"""
    if not x_admin_password or x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Доступ заборонено: невірний токен авторизації")
    return x_admin_password

def init_db():
    """Функция инициализации БД: создает таблицы продуктов и заказов"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # существующая таблица товаров
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            title TEXT NOT_NULL,
            price REAL NOT_NULL,
            discount INTEGER DEFAULT 0,
            img TEXT,
            category TEXT,
            isNew INTEGER DEFAULT 0,
            isPopular INTEGER DEFAULT 0,
            description TEXT,
            specs TEXT
        )
    """)
    
    # --- ДОБАВЛЯЕМ СЮДА ТАБЛИЦУ ЗАКАЗОВ ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_name TEXT NOT_NULL,
            user_email TEXT NOT_NULL,
            user_phone TEXT NOT_NULL,
            items TEXT NOT_NULL,
            status TEXT DEFAULT 'Новий',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Твой существующий код проверки и переноса данных из products.json
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0 and os.path.exists(JSON_PATH):
        print("База данных пуста. Переносим товары из products.json...")
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            products = json.load(f)
            
        for p in products:
            categories_json = json.dumps(p.get("category", []), ensure_ascii=False)
            specs_json = json.dumps(p.get("specs", {}), ensure_ascii=False)
            
            cursor.execute("""
                INSERT INTO products (id, title, price, discount, img, category, isNew, isPopular, description, specs)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p.get("id"),
                p.get("title"),
                p.get("price"),
                p.get("discount", 0),
                p.get("img"),
                categories_json,
                1 if p.get("isNew") else 0,
                1 if p.get("isPopular") else 0,
                p.get("description", ""),
                specs_json
            ))
        conn.commit()
        print("Перенос данных успешно завершен!")
        
    conn.close()

# Запускаем создание базы данных при старте сервера
init_db()

# --- КЛИЕНТСКИЕ ЭНДПОИНТЫ (БЕЗ ЗАЩИТЫ, ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ) ---

@app.get("/api/products")
def get_products():
    """Эндпоинт для фронтенда — отдает список товаров из базы данных"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Чтобы данные возвращались в виде словаря
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM products")
    rows = cursor.fetchall()
    conn.close()
    
    products_list = []
    for row in rows:
        product = dict(row)
        product["category"] = json.loads(product["category"])
        product["specs"] = json.loads(product["specs"])
        product["isNew"] = bool(product["isNew"])
        product["isPopular"] = bool(product["isPopular"])
        products_list.append(product)
        
    return products_list

# Описываем, какие данные о заказе мы ждем от фронтенда
class OrderCreate(BaseModel):
    name: str
    email: str
    phone: str
    items: List[Dict]

@app.post("/api/orders")
def create_order(order: OrderCreate):
    """Ендпоінт для прийому замовлень з фронтенду і збереження їх в БД + надсилання в Telegram"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    today_str = datetime.now().strftime("%d%m%y")
    
    cursor.execute("SELECT id FROM orders WHERE id LIKE ?", (f"{today_str}-%",))
    existing_ids = cursor.fetchall()
    
    max_counter = 0
    for row in existing_ids:
        try:
            parts = row[0].split("-")
            if len(parts) == 2:
                counter = int(parts[1])
                if counter > max_counter:
                    max_counter = counter
        except ValueError:
            continue
            
    next_counter = max_counter + 1
    new_id = f"{today_str}-{next_counter:02d}"
    
    items_json = json.dumps(order.items, ensure_ascii=False)
    
    try:
        cursor.execute("""
            INSERT INTO orders (id, user_name, user_email, user_phone, items)
            VALUES (?, ?, ?, ?, ?)
        """, (
            new_id,
            order.name,
            order.email,
            order.phone,
            items_json
        ))
        conn.commit()
        print(f"Замовлення успішно збережено в БД! ID: {new_id}")
        
        # --- ОТПРАВКА УВЕДОМЛЕНИЯ В TELEGRAM ---
        try:
            BOT_TOKEN = "8610215410:AAG099rXsaWXG8AYAYezy3H2-UkIM0Qd2zU"
            CHAT_ID = "434628406"
            
            items_text = ""
            total_price = 0
            for item in order.items:
                price = item.get('price', 0)
                discount = item.get('discount', 0)
                final_price = price * (1 - discount / 100) if discount > 0 else price
                
                qty = item.get('quantity', 1)
                cost = final_price * qty
                total_price += cost
                
                items_text += f"🔹 {item.get('title')} — {qty} шт. x {final_price:.2f} грн\n"

            tg_message = (
                f"🛍️ **НОВЕ ЗАМОВЛЕННЯ №{new_id}**\n\n"
                f"👤 **Покупець:** {order.name}\n"
                f"📞 **Телефон:** {order.phone}\n"
                f"📧 **Email:** {order.email}\n\n"
                f"📦 **Товари:**\n{items_text}\n"
                f"💰 **Разом до оплати:** {total_price:.2f} грн"
            )
            
            encoded_message = urllib.parse.quote_plus(tg_message)
            tg_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage?chat_id={CHAT_ID}&text={encoded_message}&parse_mode=Markdown"
            
            urllib.request.urlopen(tg_url)
            print("Сповіщення в Telegram успішно надіслано!")
            
        except Exception as tg_err:
            print(f"Помилка відправки в Telegram: {str(tg_err)}")
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Помилка збереження замовлення: {str(e)}")
    
    conn.close()
    return {"status": "success", "message": "Заказ успешно сохранен", "order_id": new_id}

# --- ЗАЩИЩЕННЫЕ ЭНДПОИНТЫ АДМИНИСТРАТОРА ---
# (Добавлена зависимость: Depends(verify_admin_password))

@app.get("/api/orders")
def get_orders(admin_password: str = Depends(verify_admin_password)):
    """Эндпоинт для админки — отдает список всех сохраненных заказов"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    orders_list = []
    for row in rows:
        order = dict(row)
        order["items"] = json.loads(order["items"])
        orders_list.append(order)
        
    return orders_list

class OrderStatusUpdate(BaseModel):
    status: str

@app.put("/api/orders/{order_id}/status")
def update_order_status(order_id: str, data: OrderStatusUpdate, admin_password: str = Depends(verify_admin_password)):
    """Эндпоинт для обновления статуса заказа"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    
    try:
        cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (data.status, order_id))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Помилка оновлення статусу: {str(e)}")
        
    conn.close()
    return {"message": f"Статус замовлення №{order_id} змінено на {data.status}"}

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: str, admin_password: str = Depends(verify_admin_password)):
    """Ендпоінт для видалення замовлення за його ID"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Перевіряємо, чи існує таке замовлення
    cursor.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    
    # Видаляємо замовлення
    cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()
    
    return {"message": f"Замовлення №{order_id} успішно видалено"}

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, admin_password: str = Depends(verify_admin_password)):
    """Эндпоинт для удаления товара из базы данных по его ID"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Проверяем, существует ли вообще такой товар
    cursor.execute("SELECT id FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    
    if not product:
        conn.close()
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    # Удаляем товар
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    
    return {"message": f"Товар з ID {product_id} успішно видалено"}

# Описываем модель данных, которую мы ждем от фронтенда
class ProductCreate(BaseModel):
    title: str
    price: float
    discount: int = 0
    img: str
    category: List[str]
    isNew: bool = False
    isPopular: bool = False
    description: str = ""
    specs: Dict[str, str] = {}

@app.post("/api/products")
def create_product(product: ProductCreate, admin_password: str = Depends(verify_admin_password)):
    """Эндпоинт для добавления нового товара в базу данных"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Автоматически находим следующий свободный ID
    cursor.execute("SELECT MAX(id) FROM products")
    max_id = cursor.fetchone()[0]
    next_id = (max_id + 1) if max_id is not None else 1
    
    # Сериализуем списки и словари в строки JSON для SQLite
    categories_json = json.dumps(product.category, ensure_ascii=False)
    specs_json = json.dumps(product.specs, ensure_ascii=False)
    
    try:
        cursor.execute("""
            INSERT INTO products (id, title, price, discount, img, category, isNew, isPopular, description, specs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            next_id,
            product.title,
            product.price,
            product.discount,
            product.img,
            categories_json,
            1 if product.isNew else 0,
            1 if product.isPopular else 0,
            product.description,
            specs_json
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Помилка при збереженні: {str(e)}")
    
    conn.close()
    return {"message": "Товар успішно додано", "id": next_id}

@app.put("/api/products/{product_id}")
def update_product(product_id: int, product: ProductCreate, admin_password: str = Depends(verify_admin_password)):
    """Эндпоинт для редактирования существующего товара"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Проверяем, есть ли такой товар
    cursor.execute("SELECT id FROM products WHERE id = ?", (product_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    categories_json = json.dumps(product.category, ensure_ascii=False)
    specs_json = json.dumps(product.specs, ensure_ascii=False)
    
    try:
        cursor.execute("""
            UPDATE products 
            SET title = ?, price = ?, discount = ?, img = ?, category = ?, 
                isNew = ?, isPopular = ?, description = ?, specs = ?
            WHERE id = ?
        """, (
            product.title,
            product.price,
            product.discount,
            product.img,
            categories_json,
            1 if product.isNew else 0,
            1 if product.isPopular else 0,
            product.description,
            specs_json,
            product_id
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Помилка оновлення: {str(e)}")
    
    conn.close()
    return {"message": f"Товар з ID {product_id} успішно оновлено"}

# Укажи правильный путь к папке с картинками твоего фронтенда
UPLOAD_DIR = os.path.join("frontend", "img", "products")
# Создаем папку, если её вдруг нет
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), admin_password: str = Depends(verify_admin_password)):
    """Эндпоинт для сохранения картинки, автоматической конвертации в WebP и оптимизации веса"""
    # Проверяем, что это точно картинка
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Файл повинен бути зображенням")
    
    try:
        # 1. Читаем картинку из запроса в оперативную память
        image_bytes = await file.read()
        image = Image.open(BytesIO(image_bytes))
        
        # 2. Обрабатываем прозрачность (альфа-каналы)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")
            
        # 3. Меняем оригинальное расширение на .webp
        clean_name = os.path.splitext(file.filename)[0]
        webp_filename = f"{clean_name}.webp"
        file_path = os.path.join(UPLOAD_DIR, webp_filename)
        
        # 4. Сохраняем с качеством 80% (визуально разницы нет, но вес файла крошечный)
        image.save(file_path, "WEBP", quality=80)
        
        # Возвращаем путь, который админка подставит в карточку товара
        return {"img_url": f"img/products/{webp_filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Не вдалося обробити та зберегти зображення: {str(e)}")

