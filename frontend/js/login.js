document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const password = document.getElementById('password-input').value;

    // Временно сохраняем введенный пароль в память браузера (localStorage)
    localStorage.setItem('admin_password', password);

    // Пробуем перейти в админку (скрипт админки сам проверит, подошел ли пароль)
    window.location.href = 'admin-orders.html';
});