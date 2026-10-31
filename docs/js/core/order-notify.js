/* Aliyan Collection - Order ko shop owner tak pohanchane ka module (WhatsApp + optional endpoint)
 * Use:  AliyanOrderNotify.notify(order, CONFIG, message)   <- Confirm Order handler ke ANDAR (sync) call karo,
 *       warna browser popup block kar dega. 'message' optional hai (na do to module khud banata hai).
 * CONFIG keys:  whatsappNumber ('923700256087'), shopName, currencySymbol, orderEndpoint (optional Formspree/Apps Script URL)
 */
(function (global) {
  'use strict';

  function pick() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }

  function money(n, cfg) {
    var sym = (cfg && cfg.currencySymbol) || '';
    var num = Number(n);
    if (isNaN(num)) return '';
    return sym + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
  }

  function buildOrderMessage(order, cfg) {
    order = order || {};
    cfg = cfg || {};
    var c = order.customer || order.shipping || order;
    var items = order.items || order.cart || [];
    var lines = [];
    lines.push('*New Order - ' + (cfg.shopName || cfg.siteName || 'Aliyan Collection') + '*');
    var id = pick(order.id, order.orderId, order.orderNumber);
    if (id) lines.push('Order ID: ' + id);
    lines.push('');
    lines.push('*Customer*');
    lines.push('Name: ' + pick(c.name, c.fullName, c.full_name));
    lines.push('Phone: ' + pick(c.phone, c.mobile));
    var addr = [pick(c.address), pick(c.city)].filter(Boolean).join(', ');
    if (addr) lines.push('Address: ' + addr);
    lines.push('');
    lines.push('*Items*');
    items.forEach(function (it, i) {
      var qty = pick(it.qty, it.quantity, 1);
      var size = pick(it.size);
      var title = pick(it.title, it.name, it.id);
      var line = (i + 1) + '. ' + title + (size ? ' (Size ' + size + ')' : '') + ' x' + qty;
      var price = pick(it.price);
      if (price !== '') line += ' - ' + money(Number(price) * Number(qty), cfg);
      lines.push(line);
    });
    lines.push('');
    var total = pick(order.total, order.grandTotal);
    if (total !== '') lines.push('*Total: ' + money(total, cfg) + '*');
    var pay = pick(order.paymentMethod, order.payment);
    if (pay) lines.push('Payment: ' + pay);
    return lines.join('\n');
  }

  function whatsappUrl(number, text) {
    var digits = String(number || '').replace(/\D/g, '');
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
  }

  function openWhatsApp(order, cfg, message) {
    var url = whatsappUrl(cfg && cfg.whatsappNumber, message || buildOrderMessage(order, cfg));
    var w = null;
    try { w = global.open(url, '_blank'); } catch (e) { w = null; }
    if (w) { try { w.opener = null; } catch (e2) { /* ignore */ } }
    /* Agar browser ne tab block kiya to page ko redirect NAHI karte (confirmation popup bachana hai);
       popup mein "Send Order on WhatsApp" button se customer dobara bhej sakta hai. */
    return url;
  }

  function sendToEndpoint(order, cfg, message) {
    if (!cfg || !cfg.orderEndpoint || typeof fetch !== 'function') return Promise.resolve(false);
    return fetch(cfg.orderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ order: order, message: message || buildOrderMessage(order, cfg) })
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function notify(order, cfg, message) {
    cfg = cfg || global.AliyanConfig || global.ALIYAN_CONFIG || global.CONFIG || {};
    var url = openWhatsApp(order, cfg, message);          // sync: popup blocker safe
    var remote = sendToEndpoint(order, cfg, message);      // background backup
    return { url: url, remote: remote };
  }

  global.AliyanOrderNotify = {
    notify: notify,
    buildOrderMessage: buildOrderMessage,
    whatsappUrl: whatsappUrl,
    openWhatsApp: openWhatsApp,
    sendToEndpoint: sendToEndpoint
  };
})(typeof window !== 'undefined' ? window : globalThis);
