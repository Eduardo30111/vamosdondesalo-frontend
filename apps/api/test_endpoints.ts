const API_URL = 'http://localhost:4000';

async function request(path: string, options: any = {}) {
  const url = `${API_URL}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: response.status, data };
  } catch (err: any) {
    return { status: 500, data: err.message };
  }
}

async function test() {
  console.log('--- STARTING ENDPOINT TEST ---');
  
  // 1. Log in
  console.log('Logging in...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@salo.co',
      password: 'admin123'
    })
  });
  
  console.log('Login Response Status:', loginRes.status);
  
  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('Login failed! Stopping test.');
    return;
  }
  
  const token = loginRes.data.access_token;
  const headers = { Authorization: `Bearer ${token}` };

  // 2. Fetch active orders
  console.log('\nFetching active orders...');
  const ordersRes = await request('/orders/cuentas-activas', { method: 'GET', headers });
  console.log('Cuentas Activas Status:', ordersRes.status);

  if (ordersRes.status !== 200) {
    console.error('Failed to fetch active orders! Stopping test.');
    return;
  }

  const orders = ordersRes.data;
  let orderId = '';
  if (Array.isArray(orders) && orders.length > 0) {
    orderId = orders[0].id;
  } else {
    console.log('\nNo active orders in database. Creating a new order...');
    // Fetch products
    const productsRes = await request('/products', { method: 'GET', headers });
    if (productsRes.status !== 200) {
      console.error('Failed to fetch products! Stopping.');
      return;
    }
    const products = productsRes.data;
    if (!Array.isArray(products) || products.length === 0) {
      console.error('No products found in database! Stopping.');
      return;
    }
    
    // Create order
    const createRes = await request('/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'TABLE',
        customerName: 'Test Endpoint Customer',
        items: [
          {
            productId: products[0].id,
            qty: 1
          }
        ]
      })
    });
    
    if (createRes.status !== 200 && createRes.status !== 201) {
      console.error('Failed to create order! Stopping.');
      return;
    }
    orderId = createRes.data.id;
  }

  console.log(`\nUsing order ID: ${orderId}`);

  // 3. Test Pagos (POST /payments)
  console.log(`\nTesting payment for order ${orderId}...`);
  const payRes = await request('/payments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      orderId,
      method: 'CASH',
      amount: 3000
    })
  });
  console.log('Payment API Status:', payRes.status);
  console.log('Payment API Data:', payRes.data);

  // 4. Test Fiar (PUT /orders/:id/fiar)
  console.log(`\nTesting fiar for order ${orderId}...`);
  // Find or create customer
  const custRes = await request('/customers', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      cedula: '123450987',
      name: 'Test Customer Fiar'
    })
  });
  console.log('Customer Creation Status:', custRes.status);
  
  if (custRes.status === 200 || custRes.status === 201) {
    const customerId = custRes.data.id;
    
    // Charge customer
    const chargeRes = await request(`/customers/${customerId}/charge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 3000 })
    });
    console.log('Charge API Status:', chargeRes.status);

    const fiarRes = await request(`/orders/${orderId}/fiar`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ customerId })
    });
    console.log('Fiar API Status:', fiarRes.status);
    console.log('Fiar API Data:', fiarRes.data);
  }

  // 5. Test Cancelar (PUT /orders/:id/cancelar)
  console.log(`\nTesting cancel/delete for order ${orderId}...`);
  const cancelRes = await request(`/orders/${orderId}/cancelar`, {
    method: 'PUT',
    headers
  });
  console.log('Cancel API Status:', cancelRes.status);
  console.log('Cancel API Data:', cancelRes.data);

  console.log('--- TEST COMPLETED ---');
}

test();
