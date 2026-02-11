// Database Storage
class DB {
    constructor() {
        this.products = this.loadProducts();
        this.transactions = this.loadTransactions();
        this.stockHistory = this.loadStockHistory();
        this.cart = [];
    }

    loadProducts() {
        const data = localStorage.getItem('products');
        return data ? JSON.parse(data) : this.getDefaultProducts();
    }

    getDefaultProducts() {
        return [
            { id: 1, code: 'P001', name: 'Indomie Goreng', category: 'Makanan', price: 3500, stock: 100, minStock: 10 },
            { id: 2, code: 'P002', name: 'Coca Cola 330ml', category: 'Minuman', price: 5000, stock: 50, minStock: 10 },
            { id: 3, code: 'P003', name: 'Aqua 600ml', category: 'Minuman', price: 3000, stock: 80, minStock: 15 },
            { id: 4, code: 'P004', name: 'Roti Tawar', category: 'Makanan', price: 12000, stock: 25, minStock: 5 },
            { id: 5, code: 'P005', name: 'Kopi ABC', category: 'Minuman', price: 8000, stock: 40, minStock: 10 },
            { id: 6, code: 'P006', name: 'Mie Sedaap', category: 'Makanan', price: 3000, stock: 120, minStock: 10 },
            { id: 7, code: 'P007', name: 'Teh Botol', category: 'Minuman', price: 4000, stock: 60, minStock: 10 },
            { id: 8, code: 'P008', name: 'Biskuit Roma', category: 'Makanan', price: 7000, stock: 35, minStock: 5 }
        ];
    }

    saveProducts() {
        localStorage.setItem('products', JSON.stringify(this.products));
    }

    loadTransactions() {
        const data = localStorage.getItem('transactions');
        return data ? JSON.parse(data) : [];
    }

    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    loadStockHistory() {
        const data = localStorage.getItem('stockHistory');
        return data ? JSON.parse(data) : [];
    }

    saveStockHistory() {
        localStorage.setItem('stockHistory', JSON.stringify(this.stockHistory));
    }

    // Product methods
    addProduct(product) {
        const newId = this.products.length > 0 ? Math.max(...this.products.map(p => p.id)) + 1 : 1;
        product.id = newId;
        this.products.push(product);
        this.saveProducts();
        return product;
    }

    updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updates };
            this.saveProducts();
            return this.products[index];
        }
        return null;
    }

    deleteProduct(id) {
        this.products = this.products.filter(p => p.id !== id);
        this.saveProducts();
    }

    getProduct(id) {
        return this.products.find(p => p.id === id);
    }

    // Transaction methods
    addTransaction(transaction) {
        const newId = this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1;
        transaction.id = newId;
        transaction.date = new Date().toISOString();
        this.transactions.push(transaction);
        this.saveTransactions();

        // Update stock
        transaction.items.forEach(item => {
            const product = this.getProduct(item.productId);
            if (product) {
                product.stock -= item.quantity;
                this.saveProducts();
            }
        });

        return transaction;
    }

    // Stock history methods
    addStockHistory(entry) {
        entry.id = this.stockHistory.length + 1;
        entry.date = new Date().toISOString();
        this.stockHistory.push(entry);
        this.saveStockHistory();
    }

    updateStock(productId, change, note) {
        const product = this.getProduct(productId);
        if (product) {
            const oldStock = product.stock;
            product.stock += change;
            this.saveProducts();

            this.addStockHistory({
                productId,
                productName: product.name,
                change,
                oldStock,
                newStock: product.stock,
                note
            });

            return product;
        }
        return null;
    }

    // Analytics
    getTodayTransactions() {
        const today = new Date().toDateString();
        return this.transactions.filter(t => new Date(t.date).toDateString() === today);
    }

    getTodaySales() {
        return this.getTodayTransactions().reduce((sum, t) => sum + t.total, 0);
    }

    getLowStockProducts() {
        return this.products.filter(p => p.stock <= p.minStock);
    }

    getTopProducts(limit = 5) {
        const productSales = {};
        
        this.transactions.forEach(transaction => {
            transaction.items.forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        productId: item.productId,
                        name: item.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].revenue += item.price * item.quantity;
            });
        });

        return Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit);
    }

    getTotalRevenue() {
        return this.transactions.reduce((sum, t) => sum + t.total, 0);
    }
}

// Initialize database
const db = new DB();

// UI Functions
function formatCurrency(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID');
}

function showAlert(message, type = 'success') {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        alert.className = `alert alert-${type} show`;
        alert.textContent = message;
        setTimeout(() => {
            alert.className = 'alert';
        }, 3000);
    });
}

// Tab Navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(targetTab).classList.add('active');
        
        // Load tab data
        loadTabData(targetTab);
    });
});

function loadTabData(tab) {
    switch(tab) {
        case 'kasir':
            loadProductsForSale();
            updateTodayStats();
            break;
        case 'produk':
            loadProductTable();
            break;
        case 'stok':
            loadStockTable();
            updateStockStats();
            break;
        case 'riwayat':
            loadHistoryTable();
            break;
        case 'laporan':
            loadReportData();
            break;
    }
}

// Kasir Functions
function loadProductsForSale() {
    const productList = document.getElementById('productList');
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    
    const filteredProducts = db.products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.code.toLowerCase().includes(searchTerm)
    );
    
    if (filteredProducts.length === 0) {
        productList.innerHTML = '<div class="empty-state">Produk tidak ditemukan</div>';
        return;
    }
    
    productList.innerHTML = filteredProducts.map(product => `
        <div class="product-item" onclick="addToCart(${product.id})">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${formatCurrency(product.price)}</div>
            <div class="product-stock">Stok: ${product.stock}</div>
        </div>
    `).join('');
}

document.getElementById('searchProduct').addEventListener('input', loadProductsForSale);

function addToCart(productId) {
    const product = db.getProduct(productId);
    if (!product) return;
    
    if (product.stock <= 0) {
        showAlert('Stok produk habis!', 'danger');
        return;
    }
    
    const existingItem = db.cart.find(item => item.productId === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showAlert('Stok tidak cukup!', 'danger');
            return;
        }
        existingItem.quantity++;
    } else {
        db.cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    renderCart();
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');
    
    if (db.cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-state">Keranjang kosong</div>';
        updateCartTotal();
        return;
    }
    
    cartItems.innerHTML = db.cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatCurrency(item.price)} x ${item.quantity}</div>
            </div>
            <div class="cart-item-controls">
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateCartQuantity(${index}, -1)">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity(${index}, 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
    
    updateCartTotal();
}

function updateCartQuantity(index, change) {
    const item = db.cart[index];
    const product = db.getProduct(item.productId);
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    if (newQuantity > product.stock) {
        showAlert('Stok tidak cukup!', 'danger');
        return;
    }
    
    item.quantity = newQuantity;
    renderCart();
}

function removeFromCart(index) {
    db.cart.splice(index, 1);
    renderCart();
}

function clearCart() {
    if (db.cart.length === 0) return;
    
    if (confirm('Yakin ingin mengosongkan keranjang?')) {
        db.cart = [];
        renderCart();
    }
}

function updateCartTotal() {
    const subtotal = db.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('grandTotal').textContent = formatCurrency(subtotal);
}

function updateTodayStats() {
    const todaySales = db.getTodaySales();
    const todayTransactions = db.getTodayTransactions().length;
    
    document.getElementById('todaySales').textContent = formatCurrency(todaySales);
    document.getElementById('todayTransactions').textContent = todayTransactions;
}

// Checkout
function checkout() {
    if (db.cart.length === 0) {
        showAlert('Keranjang kosong!', 'danger');
        return;
    }
    
    const total = db.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkoutTotal').value = formatCurrency(total);
    document.getElementById('paymentAmount').value = '';
    document.getElementById('changeAmount').value = '';
    
    document.getElementById('checkoutModal').classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
}

document.getElementById('paymentAmount').addEventListener('input', function() {
    const total = db.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const payment = parseFloat(this.value) || 0;
    const change = payment - total;
    
    document.getElementById('changeAmount').value = change >= 0 ? formatCurrency(change) : 'Kurang bayar';
});

document.getElementById('checkoutForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const total = db.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const payment = parseFloat(document.getElementById('paymentAmount').value) || 0;
    
    if (payment < total) {
        const alert = document.getElementById('checkoutAlert');
        alert.className = 'alert alert-danger show';
        alert.textContent = 'Uang tidak cukup!';
        return;
    }
    
    // Create transaction
    const transaction = {
        items: db.cart.map(item => ({...item})),
        total: total,
        payment: payment,
        change: payment - total,
        transactionNumber: 'TRX' + Date.now()
    };
    
    db.addTransaction(transaction);
    
    // Clear cart
    db.cart = [];
    
    // Update UI
    renderCart();
    updateTodayStats();
    
    // Show success
    showAlert(`Transaksi berhasil! Kembalian: ${formatCurrency(payment - total)}`, 'success');
    
    closeCheckoutModal();
});

// Product Management
function openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Tambah Produk';
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function editProduct(id) {
    const product = db.getProduct(id);
    if (!product) return;
    
    document.getElementById('productModalTitle').textContent = 'Edit Produk';
    document.getElementById('editProductId').value = product.id;
    document.getElementById('productCode').value = product.code;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productMinStock').value = product.minStock;
    
    document.getElementById('productModal').classList.add('active');
}

function deleteProduct(id) {
    if (confirm('Yakin ingin menghapus produk ini?')) {
        db.deleteProduct(id);
        loadProductTable();
        showAlert('Produk berhasil dihapus!', 'success');
    }
}

document.getElementById('productForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const productData = {
        code: document.getElementById('productCode').value,
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        minStock: parseInt(document.getElementById('productMinStock').value)
    };
    
    const editId = document.getElementById('editProductId').value;
    
    if (editId) {
        db.updateProduct(parseInt(editId), productData);
        showAlert('Produk berhasil diupdate!', 'success');
    } else {
        db.addProduct(productData);
        showAlert('Produk berhasil ditambahkan!', 'success');
    }
    
    closeProductModal();
    loadProductTable();
    loadProductsForSale();
});

function loadProductTable() {
    const tbody = document.getElementById('productTable');
    
    if (db.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada produk</td></tr>';
        return;
    }
    
    tbody.innerHTML = db.products.map(product => {
        const stockStatus = product.stock <= product.minStock 
            ? '<span class="badge badge-danger">Stok Rendah</span>'
            : '<span class="badge badge-success">Tersedia</span>';
        
        return `
            <tr>
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>${stockStatus}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-primary" onclick="editProduct(${product.id})">Edit</button>
                        <button class="btn-sm btn-danger" onclick="deleteProduct(${product.id})">Hapus</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Stock Management
function loadStockTable() {
    const tbody = document.getElementById('stockTable');
    
    if (db.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada produk</td></tr>';
        return;
    }
    
    tbody.innerHTML = db.products.map(product => {
        const stockStatus = product.stock <= product.minStock 
            ? '<span class="badge badge-danger">Rendah</span>'
            : product.stock <= product.minStock * 2
            ? '<span class="badge badge-warning">Sedang</span>'
            : '<span class="badge badge-success">Aman</span>';
        
        return `
            <tr>
                <td>${product.name}</td>
                <td>${product.stock}</td>
                <td>${stockStatus}</td>
                <td>
                    <button class="btn-sm btn-primary" onclick="openStockModal(${product.id})">
                        Update Stok
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStockStats() {
    const lowStockCount = db.getLowStockProducts().length;
    const totalProducts = db.products.length;
    
    document.getElementById('lowStockCount').textContent = lowStockCount;
    document.getElementById('totalProducts').textContent = totalProducts;
}

function openStockModal(productId) {
    const product = db.getProduct(productId);
    if (!product) return;
    
    document.getElementById('stockProductId').value = product.id;
    document.getElementById('stockProductName').value = product.name;
    document.getElementById('currentStock').value = product.stock;
    document.getElementById('stockChange').value = '';
    document.getElementById('stockNote').value = '';
    
    document.getElementById('stockModal').classList.add('active');
}

function closeStockModal() {
    document.getElementById('stockModal').classList.remove('active');
}

document.getElementById('stockForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const productId = parseInt(document.getElementById('stockProductId').value);
    const change = parseInt(document.getElementById('stockChange').value);
    const note = document.getElementById('stockNote').value;
    
    db.updateStock(productId, change, note);
    
    closeStockModal();
    loadStockTable();
    updateStockStats();
    loadProductsForSale();
    
    showAlert('Stok berhasil diupdate!', 'success');
});

// History
function loadHistoryTable() {
    const tbody = document.getElementById('historyTable');
    
    if (db.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada transaksi</td></tr>';
        return;
    }
    
    const sortedTransactions = [...db.transactions].reverse();
    
    tbody.innerHTML = sortedTransactions.map(transaction => {
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <tr>
                <td>${transaction.transactionNumber}</td>
                <td>${formattedDate}</td>
                <td>${formatCurrency(transaction.total)}</td>
                <td>${transaction.items.length} items</td>
                <td>
                    <button class="btn-sm btn-primary" onclick="viewTransactionDetail(${transaction.id})">
                        Detail
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewTransactionDetail(id) {
    const transaction = db.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const date = new Date(transaction.date);
    const formattedDate = date.toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const detailHTML = `
        <div class="form-group">
            <label>No. Transaksi</label>
            <input type="text" value="${transaction.transactionNumber}" readonly>
        </div>
        <div class="form-group">
            <label>Tanggal</label>
            <input type="text" value="${formattedDate}" readonly>
        </div>
        <div class="form-group">
            <label>Items</label>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Produk</th>
                            <th>Qty</th>
                            <th>Harga</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transaction.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${formatCurrency(item.price)}</td>
                                <td>${formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="total-section">
            <div class="total-row">
                <span>Total:</span>
                <span>${formatCurrency(transaction.total)}</span>
            </div>
            <div class="total-row">
                <span>Dibayar:</span>
                <span>${formatCurrency(transaction.payment)}</span>
            </div>
            <div class="total-row">
                <span>Kembalian:</span>
                <span>${formatCurrency(transaction.change)}</span>
            </div>
        </div>
    `;
    
    document.getElementById('transactionDetail').innerHTML = detailHTML;
    document.getElementById('transactionModal').classList.add('active');
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
}

// Reports
function loadReportData() {
    const totalRevenue = db.getTotalRevenue();
    const totalTransactions = db.transactions.length;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalTransactionsCount').textContent = totalTransactions;
    document.getElementById('avgTransaction').textContent = formatCurrency(avgTransaction);
    
    loadTopProducts();
}

function loadTopProducts() {
    const tbody = document.getElementById('topProductsTable');
    const topProducts = db.getTopProducts(10);
    
    if (topProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada data penjualan</td></tr>';
        return;
    }
    
    tbody.innerHTML = topProducts.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>${formatCurrency(product.revenue)}</td>
        </tr>
    `).join('');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadProductsForSale();
    updateTodayStats();
    renderCart();
});

