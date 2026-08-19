const os = require('os');
const QRCode = require('qrcode');

// Se você passar uma URL como argumento (ex: node gerar-qrcode.js https://seu-site.onrender.com),
// o QR Code aponta pra ela. Isso é o que você vai usar depois de publicar o projeto no Render,
// pra o QR Code funcionar em qualquer rede (inclusive 4G do cliente).
const urlPublica = process.argv[2];

// Procura o endereço IP da rede local do computador (útil só para testar
// no seu próprio Wi-Fi, antes de publicar o projeto na internet).
function encontrarIpLocal() {
    const interfaces = os.networkInterfaces();

    for (const nomeInterface in interfaces) {
        for (const detalhe of interfaces[nomeInterface]) {
            if (detalhe.family === 'IPv4' && !detalhe.internal) {
                return detalhe.address;
            }
        }
    }

    return null;
}

let url;

if (urlPublica) {
    // Usa a URL pública informada (ex: a URL do Render)
    url = urlPublica.endsWith('/index.html') ? urlPublica : `${urlPublica.replace(/\/$/, '')}/index.html`;
    console.log(`🌐 Gerando QR Code para o endereço público: ${url}`);
} else {
    // Sem URL informada: usa o IP local (só funciona no mesmo Wi-Fi, para testes)
    const ip = encontrarIpLocal();

    if (!ip) {
        console.error('❌ Não foi possível encontrar o IP da rede local.');
        process.exit(1);
    }

    const PORT = 3000;
    url = `http://${ip}:${PORT}/index.html`;

    console.log(`📡 IP local encontrado: ${ip}`);
    console.log(`🔗 O QR Code vai apontar para: ${url}`);
    console.log('');
    console.log('⚠️  Esse QR Code só funciona em aparelhos na MESMA rede Wi-Fi deste computador.');
    console.log('   Quando o projeto estiver publicado (ex: no Render), rode:');
    console.log('   node gerar-qrcode.js https://seu-site.onrender.com');
    console.log('');
}

QRCode.toFile('qrcode-cardapio.png', url, {
    width: 500,
    margin: 2
}, (err) => {
    if (err) {
        console.error('Erro ao gerar o QR Code:', err.message);
        return;
    }
    console.log('✅ QR Code gerado com sucesso: qrcode-cardapio.png');
});
