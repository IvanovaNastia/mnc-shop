import os
import json
import urllib.request
import urllib.parse
from datetime import datetime
from typing import List, Dict, Optional
from io import BytesIO
from PIL import Image

# Импорт PostgreSQL вместо sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor

# fastapi импорты
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Чтение переменных из .env
from dotenv import load_dotenv

load_dotenv()

# --- ЧТЕНИЕ ПЕРЕМЕННЫХ ИЗ .ENV ---
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Переменная базы данных из Render
DATABASE_URL = os.getenv("DATABASE_URL")

if not ADMIN_PASSWORD:
    raise RuntimeError("КРИТИЧЕСКАЯ ОШИБКА: Переменная ADMIN_PASSWORD не задана в файле .env!")

app = FastAPI()

# 1. Определяем папку для загрузки файлов
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 2. Подключаем StaticFiles к FastAPI
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JSON_PATH = "products.json"

# --- ВСПУМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОДКЛЮЧЕНИЯ К POSTGRESQL ---
def get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL не задана в переменных окружения!")
    # sslmode='require' нужен для безопасного подключения к Render Postgres
    return psycopg2.connect(DATABASE_URL, sslmode='require')

# --- ФУНКЦИЯ ПРОВЕРКИ ПАРОЛЯ ---
def verify_admin_password(x_admin_password: str = Header(None, alias="X-Admin-Password")):
    if not x_admin_password:
        raise HTTPException(status_code=401, detail="Доступ заборонено: відсутній токен")
    
    decoded_password = urllib.parse.unquote(x_admin_password)
    
    if decoded_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Доступ заборонено: невірний токен авторизації")
    return decoded_password

def init_db():
    """Инициализация PostgreSQL: создание таблиц и первичный импорт из JSON"""
    if not DATABASE_URL:
        print("⚠️ DATABASE_URL не найден, пропуск инициализации БД (для локальных тестов без БД)")
        return

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Таблица товаров
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            price NUMERIC(10, 2) NOT NULL,
            discount INTEGER DEFAULT 0,
            img TEXT,
            category TEXT,
            is_new INTEGER DEFAULT 0,
            is_popular INTEGER DEFAULT 0,
            description TEXT,
            specs TEXT
        );
    """)
    
    # Таблица заказов
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(50) PRIMARY KEY,
            user_name TEXT NOT NULL,
            user_email TEXT NOT NULL,
            user_phone TEXT NOT NULL,
            items TEXT NOT NULL,
            status TEXT DEFAULT 'Новий',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()

    # Перенос данных из products.json если база пуста
    cursor.execute("SELECT COUNT(*) FROM products;")
    count = cursor.fetchone()[0]
    
    if count == 0 and os.path.exists(JSON_PATH):
        print("База данных пуста. Переносим товары из products.json...")
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            products = json.load(f)
            
        for p in products:
            categories_json = json.dumps(p.get("category", []), ensure_ascii=False)
            specs_json = json.dumps(p.get("specs", {}), ensure_ascii=False)
            
            cursor.execute("""
                INSERT INTO products (title, price, discount, img, category, is_new, is_popular, description, specs)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
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
        print("Перенос данных в PostgreSQL успешно завершен!")
        
    cursor.close()
    conn.close()

# Запускаем инициализацию при старте
init_db()


# --- КЛИЕНТСКИЕ ЭНДПОИНТЫ ---

@app.get("/api/products")
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT * FROM products ORDER BY id ASC")
    rows = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    products_list = []
    for row in rows:
        product = dict(row)
        product["category"] = json.loads(product["category"]) if product["category"] else []
        product["specs"] = json.loads(product["specs"]) if product["specs"] else {}
        product["isNew"] = bool(product["is_new"])
        product["isPopular"] = bool(product["is_popular"])
        product["price"] = float(product["price"])
        products_list.append(product)
        
    return products_list


class OrderCreate(BaseModel):
    name: str
    email: str
    phone: str
    items: List[Dict]

@app.post("/api/orders")
def create_order(order: OrderCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    today_str = datetime.now().strftime("%d%m%y")
    
    cursor.execute("SELECT id FROM orders WHERE id LIKE %s", (f"{today_str}-%",))
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
            VALUES (%s, %s, %s, %s, %s)
        """, (
            new_id,
            order.name,
            order.email,
            order.phone,
            items_json
        ))
        conn.commit()
        print(f"Заказ успешно сохранен в PostgreSQL! ID: {new_id}")
        
        # --- TELEGRAM ---
        if BOT_TOKEN and CHAT_ID:
            try:
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
            except Exception as tg_err:
                print(f"Помилка відправки в Telegram: {str(tg_err)}")
        
    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail=f"Помилка збереження замовлення: {str(e)}")
    
    cursor.close()
    conn.close()
    return {"status": "success", "message": "Заказ успешно сохранен", "order_id": new_id}


# --- АДМИНСКИЕ ЭНДПОИНТЫ ---

@app.get("/api/orders")
def get_orders(admin_password: str = Depends(verify_admin_password)):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
    rows = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    orders_list = []
    for row in rows:
        order = dict(row)
        order["items"] = json.loads(order["items"]) if order["items"] else []
        orders_list.append(order)
        
    return orders_list


class OrderStatusUpdate(BaseModel):
    status: str

@app.put("/api/orders/{order_id}/status")
def update_order_status(order_id: str, data: OrderStatusUpdate, admin_password: str = Depends(verify_admin_password)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM orders WHERE id = %s", (order_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    
    try:
        cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (data.status, order_id))
        conn.commit()
    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail=f"Помилка оновлення статусу: {str(e)}")
        
    cursor.close()
    conn.close()
    return {"message": f"Статус замовлення №{order_id} змінено на {data.status}"}


@app.delete("/api/orders/{order_id}")
def delete_order(order_id: str, admin_password: str = Depends(verify_admin_password)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM orders WHERE id = %s", (order_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Замовлення не знайдено")
    
    cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"message": f"Замовлення №{order_id} успішно видалено"}


@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, admin_password: str = Depends(verify_admin_password)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM products WHERE id = %s", (product_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"message": f"Товар з ID {product_id} успішно видалено"}


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
    conn = get_db_connection()
    cursor = conn.cursor()
    
    categories_json = json.dumps(product.category, ensure_ascii=False)
    specs_json = json.dumps(product.specs, ensure_ascii=False)
    
    try:
        cursor.execute("""
            INSERT INTO products (title, price, discount, img, category, is_new, is_popular, description, specs)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
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
        new_id = cursor.fetchone()[0]
        conn.commit()
    except Exception as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail=f"Помилка при збереженні: {str(e)}")
    
    cursor.close()
    conn.close()
    return {"message": "Товар успішно додано", "id": new_id}


@app.put("/api/products/{product_id}")
def update_product(product_id: int, product: ProductCreate, admin_password: str = Depends(verify_admin_password)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM products WHERE id = %s", (product_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Товар не знайдено")
    
    categories_json = json.dumps(product.category, ensure_ascii=False)
    specs_json = json.dumps(product.specs, ensure_ascii=False)
    
    try:
        cursor.execute("""
            UPDATE products 
            SET title = %s, price = %s, discount = %s, img = %s, category = %s, 
                is_new = %s, is_popular = %s, description = %s, specs = %s
            WHERE id = %s
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
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail=f"Помилка оновлення: {str(e)}")
    
    cursor.close()
    conn.close()
    return {"message": f"Товар з ID {product_id} успішно оновлено"}


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), admin_password: str = Depends(verify_admin_password)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Файл повинен бути зображенням")
    
    try:
        image_bytes = await file.read()
        image = Image.open(BytesIO(image_bytes))
        
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")
            
        clean_name = os.path.splitext(file.filename)[0]
        webp_filename = f"{clean_name}.webp"
        file_path = os.path.join(UPLOAD_DIR, webp_filename)
        
        image.save(file_path, "WEBP", quality=80)
        
        return {"img_url": f"/uploads/{webp_filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Не вдалося обробити та зберегти зображення: {str(e)}")